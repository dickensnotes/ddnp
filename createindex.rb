require 'open3'
require 'json'
require 'execjs'
require 'redcarpet'
require 'redcarpet/render_strip'
require 'yaml'

# lunr_src = open(@lunr_path).read
# ctx = ExecJS.compile(lunr_src)
js_dir = "public/assets/javascript"
dickensurl = ""

@lunr_config = {'fields' => [{'jekyllfields': ['content'], 'boost': 10, 'searchfield': 'content'}, 
	{'jekyllfields': ['tags'],'searchfield': 'tags', 'boost': 10}, 
	{'jekyllfields': ['url'],'searchfield': 'url', 'boost': 1}, 
	{'jekyllfields': ['title'],'searchfield': 'title', 'boost': 20},
	{'jekyllfields': ['type'],'searchfield': 'type', 'boost': 1, 'facetfield': true},
	], 
	'fuzzysearchfields' => [],
	'displayfields' => [{'field': 'title', 'headerfield': true, 'highlight': false},
		{'field': 'url', 'headerfield': true, 'urlfield': true, 'highlight': false},
		{'field': 'tags', 'label': 'Tags'},{'field': 'type', 'label': 'Type'}
	],
	'atozsortfield' => 'title'
}
stdout_str, status = Open3.capture2('python3 createindex-parseannotations.py')

annotationcontents = JSON.parse(stdout_str)
docs = annotationcontents
index_js = open(File.join(js_dir, 'lunr.js')).read
index_js << 'var idx = lunr(function() {this.pipeline.remove(lunr.stemmer);this.searchPipeline.remove(lunr.stemmer);this.pipeline.remove(lunr.stopWordFilter);this.searchPipeline.remove(lunr.stopWordFilter);this.tokenizer.separator = /[\s,.;:/?!()]+/;'
@lunr_config['fields'].each do |field|
	index_js << "this.field('#{field[:searchfield]}', {'boost': #{field[:boost]}});"
end

Dir['src/pages/**/*.mdx'].each do |page|
	file = File.open(page, "r")
	content = file.read
	splitcontent = content.split("\n---\n")
	pagecontent = splitcontent.slice(1, splitcontent.length).join(" ")
	headercontent = YAML.load(splitcontent[0])
	stripmarkdown = Redcarpet::Markdown.new(Redcarpet::Render::StripDown).render(pagecontent)
	removetoc = stripmarkdown.split('</TOC>')
	removetoc = removetoc.length > 1 ? removetoc.slice(1,) : removetoc.slice(0,)
	striphtml = removetoc.gsub(/<\/?[^>]*>/, "")
	slug = page.gsub('src/pages', '').gsub('.mdx', '').gsub('index', '')
	url = dickensurl + slug
	docs[slug] = {'url' => url, 'content' => striphtml, 'title' => headercontent['title'], 'type' => 'Site Content'}
end
Dir['textfiles/**/*.*'].each do |page|
	puts page.inspect
	file = File.open(page, "r")
	content = file.read
	filename = page.split('/').last.gsub('.txt', '')
	puts filename.inspect
	if page.include?('BH')
		contenttype = 'Working Notes: Bleak House'
		url = "/notes/bleak-house/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/#{filename.gsub('_', '')}.json"
	elsif page.include?('HT')
		contenttype = 'Working Notes: Hard Times'
		url = "/notes/hard-times/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/HardTimesTranscriptions/#{filename.gsub('_', '')}.json"
	elsif page.include?('LD')
		contenttype = 'Working Notes: Little Dorrit'
		url = "/notes/little-dorrit/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/LittleDorritTranscriptions/#{filename.gsub('_', '')}.json"
	else
		contenttype = 'Working Notes: David Copperfield '
		url = "/notes/david-copperfield/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/#{filename.gsub('_', '')}.json"
	end
	title = filename.gsub('BH', 'Bleak House').gsub('HT', 'Hard Times').gsub('LD', 'Little Dorrit').gsub('DC', 'David Copperfield').gsub('WN', 'Working Notes').gsub('_', ' ')
	#puts content.inspect
	docs[filename] = {'url' => url, 'content' => content, 'title' => title, 'type' => contenttype}
end
docs.each do |key, doc|
	doc['content'] = doc['content'].encode!('UTF-8', 'binary', invalid: :replace, undef: :replace, replace: '').gsub(/<\/?[^>]*>/, "").gsub('\\n', ' ')
	doc['id'] = key
	doc['slug'] = key
	doc['title'] = doc['title'] ? doc['title'] : doc['content'].gsub(/<\/?[^>]*>/, "").split("\n")[0].strip()
	doc['tags'] = doc['tags'] ? doc['tags'] : ''
	doc['type'] = doc['type'] ? doc['type'] : 'Annotation'
	doc['excerpt'] =  doc['content'].gsub(/<\/?[^>]*>/, "").gsub('\\n', ' ')
	index_js << 'this.add(' << ::JSON.generate(doc, quirks_mode: true) << ');'
end
index_js << '});'

filename = File.join(js_dir, 'index.js')
ctx = ExecJS.compile(index_js)
index = ctx.eval('idx')
total = "var docs = #{docs.to_json}\nvar index = #{index}\nvar baseurl = '#{dickensurl}'\nvar lunr_settings = #{@lunr_config.to_json}"

File.open(filename, "w") { |f| f.write(total) }
