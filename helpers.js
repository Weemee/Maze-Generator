import zlib from 'zlib';

const BYTE_SIZE = 4;

export const FromBuffer = (buffer, width, height) => {
	if (buffer === undefined) {
		return { data: [], width: width, height: height };
	}
	const b = new Buffer.from(buffer, 'base64');

	const data = zlib.inflateSync(b);
	const flushedArray = new Uint16Array(width * height);

	for (let i = 0, index = 0; i < data.length; i += BYTE_SIZE, index++) {
		const d = data.readUInt32LE(i);

		flushedArray[index] = d;
	}

	return { data: flushedArray, width: width, height: height };
};

export const FillMap = (data, id) => {
	for (let i = 0; i < data.length; i += BYTE_SIZE) {
		data.writeUInt32LE(id, i);
	}

	return data;
};

export const InjectMap = (data, object, x, y, width, height) => {
	if (!object?.data) {
		return data;
	}

	let xx = 0;
	let yy = 0;

	for (let i = 0, index = 0; index < object.data.length; i += BYTE_SIZE, index++) {
		const d = object.data[index];

		const offset = y * width * BYTE_SIZE + x * BYTE_SIZE;
		const point = i + offset - yy * 8 * BYTE_SIZE;

		if (point < data.length) {
			data.writeUInt32LE(d, point);
		}

		xx++;

		if (xx % object.width === 0) {
			y++;
			yy++;
			xx = 0;
		}
	}

	return data;
};

export const getRandomIntInclusive = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
};
