"""
GlobalNews Feed Fetcher
Robust RSS 2.0 and Atom XML parser using Python standard library.
Handles timeouts, redirects, XML namespace variants, and network failures gracefully.
"""

import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
import time
import socket
from typing import List, Dict, Any, Optional

DEFAULT_TIMEOUT = 12
USER_AGENT = "GlobalNewsCollector/1.0 (+https://github.com/news/global-news-aggregator; bot)"

# Common XML Namespaces in Atom & RSS extensions
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "media": "http://search.yahoo.com/mrss/",
}

def fetch_feed_data(url: str, timeout: int = DEFAULT_TIMEOUT) -> Optional[bytes]:
    """Fetch raw XML feed data over HTTP/HTTPS with proper headers and timeout."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read()
    except (urllib.error.HTTPError, urllib.error.URLError, socket.timeout, TimeoutError) as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None
    except Exception as e:
        print(f"  [ERROR] Unexpected error fetching {url}: {e}")
        return None

def find_child_text(element: ET.Element, tag_names: List[str]) -> str:
    """Find text in element checking multiple tag name variations."""
    for tag in tag_names:
        child = element.find(tag)
        if child is not None and child.text:
            return child.text.strip()
        # Check namespaced tags
        for ns_prefix, ns_url in NAMESPACES.items():
            child_ns = element.find(f"{{{ns_url}}}{tag}")
            if child_ns is not None and child_ns.text:
                return child_ns.text.strip()
    return ""

def parse_rss_items(channel: ET.Element, source_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse RSS 2.0 <item> elements."""
    items = []
    for item in channel.findall("item"):
        title = find_child_text(item, ["title"])
        link = find_child_text(item, ["link", "guid"])
        pub_date = find_child_text(item, ["pubDate", "date", "dc:date", "published"])
        summary = find_child_text(item, ["description", "summary", "content:encoded"])
        author = find_child_text(item, ["author", "creator", "dc:creator"])

        # Fallback to link attribute if guid has isPermaLink
        if not link:
            guid = item.find("guid")
            if guid is not None and guid.get("isPermaLink") != "false" and guid.text:
                link = guid.text.strip()

        if title and link:
            items.append({
                "title": title,
                "url": link,
                "publishedAtRaw": pub_date,
                "summary": summary,
                "author": author,
                "source": source_meta.get("name", "Unknown"),
                "sourceId": source_meta.get("id", "unknown"),
                "sourceRegion": source_meta.get("region", "Global"),
                "sourceCountry": source_meta.get("country", ""),
                "defaultCategory": source_meta.get("category", "world"),
                "priority": source_meta.get("priority", 50),
            })
    return items

def parse_atom_entries(root: ET.Element, source_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse Atom 1.0 <entry> elements."""
    items = []
    # Search with and without atom namespace
    entries = root.findall("{http://www.w3.org/2005/Atom}entry")
    if not entries:
        entries = root.findall("entry")

    for entry in entries:
        title = find_child_text(entry, ["title"])
        
        # Link in atom can be an element with href attribute
        link = ""
        for l in entry.findall("{http://www.w3.org/2005/Atom}link"):
            rel = l.get("rel", "alternate")
            if rel == "alternate" and l.get("href"):
                link = l.get("href")
                break
        if not link:
            for l in entry.findall("link"):
                if l.get("href"):
                    link = l.get("href")
                    break
        if not link:
            link = find_child_text(entry, ["id"])

        pub_date = find_child_text(entry, ["published", "updated", "date", "dc:date"])
        summary = find_child_text(entry, ["summary", "content", "description"])
        author = find_child_text(entry, ["author", "creator", "dc:creator"])

        if title and link:
            items.append({
                "title": title,
                "url": link,
                "publishedAtRaw": pub_date,
                "summary": summary,
                "author": author,
                "source": source_meta.get("name", "Unknown"),
                "sourceId": source_meta.get("id", "unknown"),
                "sourceRegion": source_meta.get("region", "Global"),
                "sourceCountry": source_meta.get("country", ""),
                "defaultCategory": source_meta.get("category", "world"),
                "priority": source_meta.get("priority", 50),
            })
    return items

def parse_feed_xml(xml_bytes: bytes, source_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Safe parser handling both RSS 2.0 and Atom feeds."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        # Fallback: attempt to decode to string, clean non-XML characters, retry
        try:
            text = xml_bytes.decode("utf-8", errors="replace")
            # Strip invalid control chars if present
            cleaned_text = "".join(ch for ch in text if ch == "\t" or ch == "\n" or ch == "\r" or ord(ch) >= 32)
            root = ET.fromstring(cleaned_text.encode("utf-8"))
        except Exception:
            print(f"  [WARN] XML Parsing error for {source_meta.get('name')}: {e}")
            return []

    # Check if Atom feed
    tag = root.tag.lower()
    if "feed" in tag:
        return parse_atom_entries(root, source_meta)

    # Check if RSS
    channel = root.find("channel")
    if channel is not None:
        return parse_rss_items(channel, source_meta)

    # Check for direct items inside root
    items = parse_rss_items(root, source_meta)
    if items:
        return items

    # Fallback to atom search inside root
    return parse_atom_entries(root, source_meta)

def fetch_source_feeds(source_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetch all configured feeds for a given source."""
    all_items = []
    feeds = source_meta.get("feeds", [])
    for feed_url in feeds:
        data = fetch_feed_data(feed_url)
        if data:
            items = parse_feed_xml(data, source_meta)
            all_items.extend(items)
    return all_items
