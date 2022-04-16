import fs from 'fs';
import xml2js, { parseString } from 'xml2js';

export const InjectIntoXML = async (background, walls, props) => {
	console.log('Loading XML template file...');
	fs.readFile('temp.xml', (error, data) => {
		if (error) {
			return console.log('Error loading XML: ', error);
		}

		console.log('XML loaded!');
		return parseString(data, (error, json) => {
			if (error) {
				return console.log('Error parsing XML: ', error);
			}

			json.map.layer[0] = {
				$: json.map.layer[0].$,
				data: [
					{
						$: {
							encoding: 'base64',
							compression: 'zlib',
						},
						_: `${background}`,
					},
				],
			};

			json.map.layer[1] = {
				$: json.map.layer[1].$,
				data: [
					{
						$: {
							encoding: 'base64',
							compression: 'zlib',
						},
						_: `${walls}`,
					},
				],
			};

			json.map.layer[2] = {
				$: json.map.layer[2].$,
				data: [
					{
						$: {
							encoding: 'base64',
							compression: 'zlib',
						},
						_: `${props}`,
					},
				],
			};

			const builder = new xml2js.Builder();
			const xml = builder.buildObject(json);

			fs.writeFile('giraffe.tmx', xml, (error, data) => {
				if (error) {
					return console.log('Error creating XML: ', error);
				}

				console.log('Successfully injected XML file with data!');
			});
		});
	});
};
