---
layout: "../../layouts/page.astro"
title: "Search the DDNP"
description: "Users can search the Working Notes, annotations, and content of the Digital Dickens Notes Project."
---

The DDNP's search tool will display results for keywords found in the Working Notes, in the Annotations for each set of Notes, and in the Site Content. Search results can be filtered according to these categories, and by the relevant novel, using the "Type" list on the left of the results page. Results include a snippet of the text in which the result is found, with hyperlinks to the relevant page.

<form role="search">
<div class="search-control mb-6">
    <input type="search" id="person-serarch" name="query"
           placeholder="Keyword Search"
           aria-label="Search people using keyword"
           class="p-2 border border-gray-300 outline-offset-0 rounded-md">
    <button class="custom_button border border-ddnpblue rounded-md p-2 hover:bg-ddnpblue/5 font-medium shadow-sm">Search</button>
</div>
</form>
<script src="https://dnoneill.github.io/jekyll-lunr-js-custom-search/js/custom-search.js"></script>
<link rel="stylesheet" type="text/css" href="https://dnoneill.github.io/jekyll-lunr-js-custom-search/css/custom-search.css">
<div id="spinner"><i class="fa fa-spinner fa-spin"></i></div>
<script src="/assets/javascript/index.js"></script>

<div id="header_info"></div>
<div style="float: left; width: 20%; ">
  <div id="facets">
  </div>
</div>
<div style="float: left; width: 79%; display: none; border: 1px solid #ccc" class="all_results">
  <div id="search_results">
    <div id="searchInfo">
      <span id="number_results"></span>
      <span id="sort_by" class="dropdownsort"><label for="sortSelect">Sort By:</label>
        <select id="sortSelect" name="sort" onchange="changeSort(event);">
          <option value="">Relevance</option>
          <option value="atoz">Name (Asc)</option>
          <option value="atoz___desc">Name (Desc)</option>
        </select>
      </span>
    </div>
  </div>
  <ul id="resultslist">
  </ul>
  <div id="pagination"></div>
</div>
<div style="clear:both"><span></span></div>

<script>
window.addEventListener("load", function(){
    loadsearchtemplate();
    $('#spinner').hide();
});
</script>