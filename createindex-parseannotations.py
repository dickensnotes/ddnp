import glob

import re, json, yaml, requests, os
from bs4 import BeautifulSoup


def encodedecode(chars):
	if type(chars) == str:
		return chars
	else:
		return chars.encode('utf8')

def get_search(anno):
	annoid = anno['id'] if 'id' in anno.keys() else anno['@id']
	annodata_data = {'json': anno, 'searchfields': {'content': []}, 'facets': {'tags': [], 'creator': [], 'geotagging': []}, 'datecreated':'', 'datemodified': '', 'id': annoid, 'basename': os.path.basename(annoid)}
	if 'oa:annotatedAt' in anno.keys():
		annodata_data['datecreated'] = encodedecode(anno['oa:annotatedAt'])
	if 'created' in anno.keys():
		annodata_data['datecreated'] = encodedecode(anno['created'])
	if 'oa:serializedAt' in anno.keys():
		annodata_data['datemodified'] = encodedecode(anno['oa:serializedAt'])
	if 'modified' in anno.keys():
		annodata_data['datemodified'] = encodedecode(anno['modified'])
	if 'oa:annotatedBy' in anno.keys():
		annodata_data['facets']['creator'] = anno['oa:annotatedBy']
	if 'creator' in anno.keys():
		annodata_data['facets']['creator'] = anno['creator']['name']
	textdata = anno['resource'] if 'resource' in anno.keys() else anno['body']
	textdata = textdata if type(textdata) == list else [textdata]
	for resource in textdata:
		chars = BeautifulSoup(resource['chars'], 'html.parser').get_text() if 'chars' in resource.keys() else ''
		chars = encodedecode(chars)
		typefield = 'type' if 'type' in resource.keys() else '@type'
		if chars and 'tag' in resource[typefield].lower():
			annodata_data['facets']['tags'].append(chars)
		elif 'purpose' in resource.keys() and 'tag' in resource['purpose']:
			if 'geotagging' in resource['purpose']:
				annodata_data['facets']['geotagging'].append('Geotagging')
				annodata_data['facets']['geotagging'].append(resource['geometry']['type'])
			else:
				tags_data = chars if chars else resource['value']
				annodata_data['facets']['tags'].append(encodedecode(tags_data))
		elif chars:
			annodata_data['searchfields']['content'].append(chars)
		elif 'items' in resource.keys():
			field = 'value' if 'value' in resource['items'][0].keys() else 'chars'
			fieldvalues = " ".join([encodedecode(item[field]) for item in resource['items']])
			annodata_data['searchfields']['content'].append(fieldvalues)
		elif 'value' in resource.keys():
			annodata_data['searchfields']['content'].append(encodedecode(resource['value']))
		if 'created' in resource.keys() and annodata_data['datecreated'] < resource['created']:
			annodata_data['datecreated'] = resource['created']
		if 'modified' in resource.keys() and annodata_data['datemodified'] < resource['modified']:
			annodata_data['datemodified'] = resource['modified']
		if 'creator' in resource.keys() and resource['creator']['name'] not in annodata_data['facets']['creator']:
			annodata_data['facets']['creator'].append(resource['creator']['name'])
	if annodata_data['datecreated'] and not annodata_data['datemodified']:
		annodata_data['datemodified'] = annodata_data['datecreated']
	annodata_data['searchfields']['content'] = " ".join(annodata_data['searchfields']['content'])
	annodata_data['searchfields']['tags'] = " ".join(annodata_data['facets']['tags'])
	return annodata_data
def main():
	url = "https://dickensnotes.github.io/dickens-annotations"
	response = requests.get(url)
	data = response.json()['annotations']
	allsearchfields = []
	regex = r"stroke-width=\\\"(.*?)\\\""
	for items in data:
		if '-list.json' not in items['filename']:
			jsoncontent = items['json']
			searchfields = get_search(jsoncontent)
			canvas =jsoncontent['on'][0]['full']
			canvasname = canvas.split('/iiif/')[-1].split('/')[0]
			name = {'bleakhousetranscriptions': {'url': "/notes/bleak-house/mirador", 'label': 'Bleak House'},
			'davidcopperfieldtranscription': {'url': "/notes/david-copperfield/mirador", 'label': 'David Copperfield'},
			'HardTimesTranscription': {'url': "/notes/hard-times/mirador", 'label': 'Hard Times'},
			'littledorrittranscription': {'url': "/notes/little-dorrit/mirador", 'label': 'Little Dorrit'},
			}
			getinfo = name[canvasname]
			url = getinfo['url']
			contenttype = "Annotations: {}".format(getinfo['label'])
			url += '?canvas={}'.format(canvas)
			url += '&annotationid={}'.format(jsoncontent['@id'])
			searchfields['searchfields']['url'] = url
			searchfields['searchfields']['type'] = contenttype
			allsearchfields.append(searchfields)

	docs = {}
	for item in allsearchfields:
		docs[item['basename']] = item['searchfields']
	print(json.dumps(docs))

main()
