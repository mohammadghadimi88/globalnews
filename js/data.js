/** GlobalNews Data Layer & In-Memory Precomputed Search Index */
let _stories=[]; let _sources=[]; let _searchIndex=[]; let _isLoaded=false;

export function escapeHTML(str){if(!str)return "";return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}

export function formatRelativeTime(isoDateString){if(!isoDateString)return "Recently";try{const pubDate=new Date(isoDateString),now=new Date(),diffMs=now.getTime()-pubDate.getTime(),diffMins=Math.floor(diffMs/60000),diffHours=Math.floor(diffMins/60),diffDays=Math.floor(diffHours/24);if(diffMins<1)return "Just now";if(diffMins<60)return `${diffMins} min ago`;if(diffHours===1)return "1 hr ago";if(diffHours<24)return `${diffHours} hrs ago`;if(diffDays===1)return "Yesterday";if(diffDays<7)return `${diffDays} days ago`;return pubDate.toLocaleDateString(undefined,{month:"short",day:"numeric",year:pubDate.getFullYear()!==now.getFullYear()?"numeric":undefined});}catch(e){return "Recently";}}

/** Normalize searchable text consistently across titles, summaries and metadata. */
export function normalizeSearchText(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function buildSearchIndex(stories){
  return stories.map((story,index)=>{
    const titleNorm=normalizeSearchText(story.title),summaryNorm=normalizeSearchText(story.summary),sourceNorm=normalizeSearchText(story.source),categoryNorm=normalizeSearchText(story.category),subcategoryNorm=normalizeSearchText(story.subcategory),regionNorm=normalizeSearchText(story.region),countryNorm=normalizeSearchText(story.country),authorNorm=normalizeSearchText(story.author),sourceRegionNorm=normalizeSearchText(story.sourceRegion),tagsNorm=(story.tags||[]).map(t=>normalizeSearchText(t));
    const titleTokens=new Set(titleNorm.split(/\s+/).filter(Boolean)),summaryTokens=new Set(summaryNorm.split(/\s+/).filter(Boolean)),allTokens=new Set([...titleTokens,...summaryTokens,...tagsNorm]);
    const searchableNorm=normalizeSearchText([story.title,story.summary,story.author,story.source,story.sourceRegion,story.country,story.category,story.subcategory,(story.tags||[]).join(" "),story.url].join(" "));
    return {index,story,titleNorm,summaryNorm,sourceNorm,categoryNorm,subcategoryNorm,regionNorm,countryNorm,authorNorm,sourceRegionNorm,tagsNorm,titleTokens,summaryTokens,allTokens,searchableNorm,pubTimestamp:new Date(story.publishedAt||0).getTime()};
  });
}
export async function loadNewsData(){try{const [newsRes,sourcesRes]=await Promise.all([fetch(new URL("../data/news.json", import.meta.url),{cache:"no-cache"}),fetch(new URL("../data/sources.json", import.meta.url),{cache:"no-cache"})]);if(!newsRes.ok)throw new Error(`Failed to load news data (HTTP ${newsRes.status})`);const newsData=await newsRes.json();_stories=Array.isArray(newsData)?newsData:(newsData.stories||[]);if(sourcesRes.ok)_sources=await sourcesRes.json();_searchIndex=buildSearchIndex(_stories);_isLoaded=true;return {success:true,count:_stories.length,stories:_stories,sources:_sources};}catch(error){console.error("GlobalNews data loading error:",error);return {success:false,error:error.message||"Failed to load news dataset.",stories:[],sources:[]};}}

export function getAllStories(){return _stories;} export function getSources(){return _sources;} export function getSearchIndex(){return _searchIndex;} export function isDataLoaded(){return _isLoaded;} export function getTopStories(limit=6){return [..._stories].sort((a,b)=>(b.rankScore||0)-(a.rankScore||0)).slice(0,limit);}
