#!/usr/bin/env node

import zlib from 'zlib';
import fs from 'fs';
import { InjectIntoXML } from './xml.js';
import { FromBuffer, InjectMap, getRandomIntInclusive, FillMap } from './helpers.js';
import {
	cornerBottomLeft,
	cornerBottomRight,
	cornerUpperLeft,
	cornerUpperRight,
	horizontalWall,
	verticalWall,
	intersection,
	intersectionTop,
	intersectionDown,
	intersectionLeft,
	intersectionRight,
	endDown,
	endLeft,
	endRight,
	endUp,
} from './pieces.js';

const BYTE_SIZE = 4;
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const WACKING = true; // If we wack down doors, making it easier
const WACKING_ROUGHNESS = 5;
const SHADOW_TILE = 1135;
const FLOOR_TILE = 74;
const FILL_TILE = 855;

const PILLAR_SHADOW_TILE_ONE = 15;
const PILLAR_SHADOW_TILE_TWO = 3;
const PILLAR_SHADOW_BOTTOM_RIGHT_CORNER_TILE = 868;
const PILLAR_SHADOW_TOP_RIGHT_CORNER_TILE = 844;
const PILLAR_SHADOW_RIGHT_EDGE_TILE = 856;

const LEFT_EDGE_FACING_WALL_TILE = 25;
const MIDDLE_EDGE_FACING_WALL_TILE = 26;
const RIGHT_EDGE_FACING_WALL_TILE = 27;

const LEFT_EDGE_WALL_TILE = 856;

const PILLAR_HEIGHT = 3;

const DISTANCE_BETWEEN_POOPS = 4;
let lastPoopProp = 0;

const DISTANCE_BETWEEN_SINGLE_ROCK_PROPS = 7;
let lastSingleRockProp = 0;

const DISTANCE_BETWEEN_DOUBLE_MULTI_ROCK_PROPS = 8;
let lastDoubleMultiRockProp = 0;

const DISTANCE_BETWEEN_TRIPLE_MULTI_ROCK_PROPS = 7;
let lastTripleMultiRockProp = 0;

const SAND_CHANCE = 0.15;
const FLOOR_SHIT_CHANCE = 0.27;

const GROUND_TILE_VARIATIONS = [
	636, // Single pebble top right
	624, // Single pebble top left
	612, // Triple pebble
	600, // Double pebble
];

const ROCK_POOP_TILE = 574;

const ROCK_PROP_TILES = [
	//541, // Double rocks
	//542, // Double rocks
	571, // Single Big Rock
];

const TRIPLE_MULTI_ROCKS = [
	/*
	[
		[605, 606, 607],
		[617, 618, 619],
		[629, 630, 631],
		[641, 642, 0],
	],*/
	[
		[0, 622, 623],
		[0, 634, 635],
		[645, 646, 647],
		[657, 658, 659],
	],
	/*
	[
		[0, 598, 599],
		[0, 610, 611],
		[621, 622, 623],
		[633, 634, 635],
	],*/
];

const SAND_DUNE_TILE = 129;

const walkableArray = [];
const wallEdge = [];

const map =
	'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';
const background = 'eJztwwEJAAAMBKHL9/0DDZZDwVVTVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/AfoQS0Y=';
const blackBackground = 'eJztwwEJAAAMA6DBQ65/k8FzKNhLqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/gG01Lxk';
const empty = 'eJztwTEBAAAAwqD1T+1lC6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAbnEAAAQ==';
const props =
	'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';

const dataBuffer = new Buffer.from(empty, 'base64');
const backgroundBuffer = new Buffer.from(background, 'base64');
const propsBuffer = new Buffer.from(empty, 'base64');

//const d = zlib.deflateSync(premiumPoop);

let data = zlib.inflateSync(dataBuffer);
data = FillMap(data, FILL_TILE);

let backgroundData = zlib.inflateSync(backgroundBuffer);
backgroundData = FillMap(backgroundData, FLOOR_TILE);

let propsData = zlib.inflateSync(propsBuffer);

//console.log('\nSize is: ', data.length);

//const uintArray = new Uint16Array(data);
//let flushedArray = new Uint16Array(MAP_WIDTH * MAP_HEIGHT);

//console.log('\nFlushed array size: ', flushedArray.length);

/*
for (let i = 0, index = 0; i < data.length; i += BYTE_SIZE, index++) {
   flushedArray[index] = data.readUInt32LE(i);
   index++;
}
*/

const generatePiece = (array) => {
	return FromBuffer(array[getRandomIntInclusive(0, array.length - 1)], 8, 11);
};

const UL = () => generatePiece(cornerUpperLeft); // 1
const UR = () => generatePiece(cornerUpperRight); // 2
const BL = () => generatePiece(cornerBottomLeft); // 3
const BR = () => generatePiece(cornerBottomRight); // 4

const ED = () => generatePiece(endDown); // 5
const EU = () => generatePiece(endUp); // 6
const EL = () => generatePiece(endLeft); // 7
const ER = () => generatePiece(endRight); // 8

const I = () => generatePiece(intersection); // 9
const HW = () => generatePiece(horizontalWall); // 10
const VW = () => generatePiece(verticalWall); // 11

const IT = () => generatePiece(intersectionTop); // 12
const ID = () => generatePiece(intersectionDown); // 13
const IL = () => generatePiece(intersectionLeft); // 14
const IR = () => generatePiece(intersectionRight); // 15

const figureOutPiece = (doors) => {
	if (doors[0] && doors[1] && doors[2] && doors[3]) {
		// Intersection
		//console.log('Intersection');
		return I();
	}

	if (doors[0] && doors[1] && doors[2] && !doors[3]) {
		// Intersection Left
		//console.log('Intersection Left');
		return IL();
	}

	if (doors[0] && doors[1] && !doors[2] && doors[3]) {
		// Intersection Down
		//console.log('Intersection Down');
		return ID();
	}

	if (doors[0] && !doors[1] && doors[2] && doors[3]) {
		// Intersection Right
		//console.log('Intersection Right');
		return IR();
	}

	if (!doors[0] && doors[1] && doors[2] && doors[3]) {
		// Intersection Top
		//console.log('Intersection Top');
		return IT();
	}

	if (doors[0] && !doors[1] && !doors[2] && !doors[3]) {
		// End Down
		//console.log('End Down');
		return ED();
	}

	if (!doors[0] && doors[1] && !doors[2] && !doors[3]) {
		// End Left
		//console.log('End Left');
		return EL();
	}

	if (!doors[0] && !doors[1] && doors[2] && !doors[3]) {
		// End Up
		//console.log('End Up');
		return EU();
	}

	if (!doors[0] && !doors[1] && !doors[2] && doors[3]) {
		// End Right
		//console.log('End Right');
		return ER();
	}

	if (!doors[0] && doors[1] && !doors[2] && doors[3]) {
		// Horizontal Wall
		//console.log('Horizontal Wall');
		return HW();
	}

	if (doors[0] && !doors[1] && doors[2] && !doors[3]) {
		// Vertical Wall
		//console.log('Vertical Wall');
		return VW();
	}

	if (!doors[0] && doors[1] && doors[2] && !doors[3]) {
		// Upper Left
		//console.log('Upper Left');
		return UL();
	}

	if (!doors[0] && !doors[1] && doors[2] && doors[3]) {
		// Upper Right
		//console.log('Upper Right');
		return UR();
	}

	if (doors[0] && doors[1] && !doors[2] && !doors[3]) {
		// Bottom Left
		//console.log('Bottom Left');
		return BL();
	}

	if (doors[0] && !doors[1] && !doors[2] && doors[3]) {
		// Bottom Right
		//console.log('Bottom Right');
		return BR();
	}

	//console.log('NO PIECE!');
};

class Room {
	constructor(x, y) {
		this.doors = [false, false, false, false];
		this.piece = null;
		this.deadEnd = false;
		this.used = false;
		this.first = false;
		this.x = x;
		this.y = y;

		this.fixPiece();
	}

	fixPiece() {
		//console.log(`Position: X[${this.getX()}], Y[${this.getY()}]`);
		this.setPiece(figureOutPiece(this.getDoors()));

		//console.log('---------------');
	}

	fixDeadEnd() {
		let count = 0;
		this.getDoors().map((d) => {
			if (d) {
				count++;
			}
		});

		this.setDeadEnd(count === 1);
	}

	getX() {
		return this.x;
	}

	getY() {
		return this.y;
	}

	isFirst() {
		return this.first;
	}

	toggleFirst() {
		this.first = true;
	}

	setPiece(p) {
		this.piece = p;
	}

	getPiece() {
		return this.piece;
	}

	isUsed() {
		return this.used;
	}

	toggleUsed() {
		this.used = true;
	}

	isDoorOpen(n) {
		return this.doors[n];
	}

	openDoor(n) {
		this.doors[n] = true;

		this.fixPiece();
		this.fixDeadEnd();
	}

	setDoors(doors) {
		this.doors = doors;
		this.fixDeadEnd();
	}

	getDoors() {
		return this.doors;
	}

	isDeadEnd() {
		return this.deadEnd;
	}

	setDeadEnd(b) {
		this.deadEnd = b;
	}

	toggleDeadEnd() {
		this.deadEnd = true;
	}
}

const oppositeDoor = (index) => {
	if (index < 3) {
		// 1 or 2
		return index + 2 - 1; // N = 1, 1+2 = 3 = S & -1 for index;
	} else {
		return index - 3; // S = 3 & -3 gives us index 0 (N)
	}
};

const GenerateMaze = () => {
	const gridX = 12; // 12
	const gridY = 9; // 9

	const stepW = 8;
	const stepH = 11;

	const startX = getRandomIntInclusive(0, gridX - 1);
	const startY = getRandomIntInclusive(0, gridY - 1);

	console.log(`Start, X: ${startX}, Y: ${startY}`);

	let roomsFilled = 0;
	const totalRooms = gridX * gridY;
	let safetyDance = 0;

	let nextX = startX;
	let nextY = startY;

	let prevX = startX;
	let prevY = startY;

	let roomGrid = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	];

	for (let i = 0; i < gridX; i++) {
		for (let j = 0; j < gridY; j++) {
			const r = new Room(i, j);
			roomGrid[i][j] = r;
		}
	}

	console.log('Done');

	const DIRECTIONS = [1, 2, 3, 4];
	const DX = [0, 1, 0, -1];
	const DY = [-1, 0, 1, 0];

	const STACK = [];
	let dir = 0;
	let currentRoom = new Room(startX, startY);
	let startingRoom = currentRoom;
	let nextRoom = currentRoom;
	let previousRoom = currentRoom;

	roomGrid[startX][startY] = currentRoom;
	currentRoom.toggleUsed();
	STACK.push(currentRoom);
	roomsFilled++;

	const shuffleDirections = () => {
		const r = getRandomIntInclusive(0, 3);

		for (let i = DIRECTIONS.length - 1; i >= 0; i--) {
			const index = getRandomIntInclusive(i);
			let temp = DIRECTIONS[index];

			DIRECTIONS[index] = DIRECTIONS[i];
			DIRECTIONS[i] = temp;

			temp = DX[index];
			DX[index] = DX[i];
			DX[i] = temp;

			temp = DY[index];
			DY[index] = DY[i];
			DY[i] = temp;
		}
	};

	const withinBounds = (x, y) => {
		return x >= 0 && y >= 0 && x < gridX && y < gridY;
	};

	while (roomsFilled !== gridX * gridY && safetyDance < 5000) {
		if (STACK.length - 1 < 0) {
			break;
		}

		//console.log('Safety: ', safetyDance);
		shuffleDirections();

		currentRoom = STACK[STACK.length - 1];
		let valid = false;
		const currentX = currentRoom.getX();
		const currentY = currentRoom.getY();

		if (!roomGrid[currentX][currentY]) {
			safetyDance = 5001;
			continue;
		}

		for (let i = 0; i < DIRECTIONS.length; i++) {
			dir = DIRECTIONS[i];

			nextX = currentX + DX[i];
			nextY = currentY + DY[i];

			if (withinBounds(nextX, nextY) && !roomGrid[nextX][nextY].isUsed()) {
				nextRoom = roomGrid[nextX][nextY];
				nextRoom.openDoor(oppositeDoor(dir));
				nextRoom.toggleUsed();
				STACK.push(nextRoom);
				roomGrid[currentX][currentY].openDoor(dir - 1);

				valid = true;
				break;
			}
		}

		if (valid) {
			roomsFilled++;
			previousRoom = currentRoom;

			currentRoom = nextRoom;
		} else {
			const r = roomGrid[currentX][currentY];
			r.toggleDeadEnd();

			previousRoom = currentRoom;
			currentRoom = STACK.pop();
		}

		safetyDance++;
	}

	// Fix missing pieces
	for (let i = 0; i < gridX; i++) {
		for (let j = 0; j < gridY; j++) {
			const tile = roomGrid[i][j];

			if (!tile.getPiece()) {
				console.log('-------------------------');
				const x = tile.getX();
				const y = tile.getY();
				console.log(`Missing piece at, X: ${x}, Y: ${y}`);
				let firstFound = false;
				let otherRoom;

				if (x + 1 < gridX) {
					tile.openDoor(1);
					roomGrid[x + 1][y].openDoor(3);
				} else if (x - 1 >= 0) {
					tile.openDoor(3);
					roomGrid[x - 1][y].openDoor(1);
				} else if (y + 1 < gridY) {
					tile.openDoor(2);
					roomGrid[x][y + 1].openDoor(0);
				} else if (y - 1 >= 0) {
					tile.openDoor(0);
					roomGrid[x][y - 1].openDoor(2);
				}

				console.log('-------------------------');
			}
		}
	}

	// Wax a mole, or, Wack a door
	if (WACKING && WACKING_ROUGHNESS > 1) {
		for (
			let i = getRandomIntInclusive(0, Math.round(gridX / WACKING_ROUGHNESS));
			i < gridX;
			i += Math.floor(gridX / WACKING_ROUGHNESS)
		) {
			for (
				let j = getRandomIntInclusive(0, Math.round(gridY / WACKING_ROUGHNESS));
				j < gridY;
				j += Math.round(gridY / WACKING_ROUGHNESS)
			) {
				const tile = roomGrid[i][j];

				const x = tile.getX();
				const y = tile.getY();

				if (x + 1 < gridX && !tile.isDoorOpen(1)) {
					tile.openDoor(1);
					roomGrid[x + 1][y].openDoor(3);
				} else if (x - 1 >= 0 && !tile.isDoorOpen(3)) {
					tile.openDoor(3);
					roomGrid[x - 1][y].openDoor(1);
				} else if (y + 1 < gridY && !tile.isDoorOpen(2)) {
					tile.openDoor(2);
					roomGrid[x][y + 1].openDoor(0);
				} else if (y - 1 >= 0 && !tile.isDoorOpen(0)) {
					tile.openDoor(0);
					roomGrid[x][y - 1].openDoor(2);
				}
			}
		}
	}

	// Inject maze into our map data
	for (let i = 0; i < gridX; i++) {
		for (let j = 0; j < gridY; j++) {
			const tile = roomGrid[i][j];

			data = InjectMap(data, tile.getPiece(), 2 + i * stepW, 1 + j * stepH, MAP_WIDTH, MAP_HEIGHT);
		}
	}
};

GenerateMaze();

const GetWalkableTiles = () => {
	for (let i = 0, index = 0; i < data.length; i += BYTE_SIZE, index++) {
		let d = data.readUInt32LE(i);
		let shadow =
			d === LEFT_EDGE_FACING_WALL_TILE || d === MIDDLE_EDGE_FACING_WALL_TILE || d === RIGHT_EDGE_FACING_WALL_TILE
				? SHADOW_TILE
				: 0;
		const rightEdge = d === RIGHT_EDGE_FACING_WALL_TILE;
		const shadowWall = d === PILLAR_SHADOW_RIGHT_EDGE_TILE;
		const shadowCorner = d === PILLAR_SHADOW_BOTTOM_RIGHT_CORNER_TILE;

		const propCorner = d === LEFT_EDGE_FACING_WALL_TILE || d === RIGHT_EDGE_FACING_WALL_TILE;

		const tripleMultiRock =
			d === MIDDLE_EDGE_FACING_WALL_TILE &&
			data.readUInt32LE(i + 1 * BYTE_SIZE) === MIDDLE_EDGE_FACING_WALL_TILE &&
			data.readUInt32LE(i + 2 * BYTE_SIZE) === MIDDLE_EDGE_FACING_WALL_TILE;

		const doubleMultiRockRight =
			d === MIDDLE_EDGE_FACING_WALL_TILE && data.readUInt32LE(i + 1 * BYTE_SIZE) === MIDDLE_EDGE_FACING_WALL_TILE;
		const doubleMultiRockLeft =
			d === MIDDLE_EDGE_FACING_WALL_TILE && data.readUInt32LE(i - 1 * BYTE_SIZE) === MIDDLE_EDGE_FACING_WALL_TILE;

		if (d === 0) {
			d = 12;
		} else {
			d = 0;
		}

		walkableArray[index] = d;

		const rs = MAP_WIDTH * BYTE_SIZE;

		if (shadowWall) {
			backgroundData.writeUInt32LE(SHADOW_TILE, i + 1 * BYTE_SIZE);

			if (i + rs + 1 * BYTE_SIZE < data.length) {
				backgroundData.writeUInt32LE(SHADOW_TILE, i + rs + 1 * BYTE_SIZE);
			}
		}

		if (shadowCorner) {
			backgroundData.writeUInt32LE(SHADOW_TILE, i + 1 * BYTE_SIZE);

			if (i + rs + 1 * BYTE_SIZE < data.length) {
				backgroundData.writeUInt32LE(SHADOW_TILE, i + rs + 1 * BYTE_SIZE);
			}
		}

		if (shadow) {
			if (propCorner) {
				lastPoopProp++;
				lastSingleRockProp++;

				if (lastPoopProp === DISTANCE_BETWEEN_POOPS) {
					propsData.writeUInt32LE(ROCK_POOP_TILE, i);
					lastPoopProp = 0;
				}

				if (lastSingleRockProp === DISTANCE_BETWEEN_SINGLE_ROCK_PROPS) {
					propsData.writeUInt32LE(ROCK_PROP_TILES[getRandomIntInclusive(0, ROCK_PROP_TILES.length - 1)], i);
					lastSingleRockProp = 0;
				}
			}

			if (tripleMultiRock) {
				lastTripleMultiRockProp++;

				if (lastTripleMultiRockProp === DISTANCE_BETWEEN_TRIPLE_MULTI_ROCK_PROPS) {
					console.log('Triple multi rock!');
					const rand = getRandomIntInclusive(0, TRIPLE_MULTI_ROCKS.length - 1);
					const rock = TRIPLE_MULTI_ROCKS[rand];

					for (let x = rock.length - 1; x >= 0; x--) {
						for (let y = 0; y < rock[x].length; y++) {
							const tile = rock[x][y];
							console.log('Tile: ', tile);

							const offset = x * MAP_WIDTH * BYTE_SIZE + y * BYTE_SIZE;
							const point = i + offset - MAP_WIDTH * BYTE_SIZE * 2;

							propsData.writeUInt32LE(tile, point);
						}
					}

					lastTripleMultiRockProp = 0;
				}
			}

			wallEdge[index] = shadow;
			backgroundData.writeUInt32LE(shadow, i);

			if (i + rs < data.length) {
				backgroundData.writeUInt32LE(shadow, i + rs);
			}

			if (rightEdge) {
				backgroundData.writeUInt32LE(shadow, i + 1 * BYTE_SIZE);

				if (i + rs + 1 * BYTE_SIZE < data.length) {
					backgroundData.writeUInt32LE(shadow, i + rs + 1 * BYTE_SIZE);
				}

				if (i - MAP_WIDTH * PILLAR_HEIGHT * BYTE_SIZE >= 0) {
					const pieceOne = data.readUInt32LE(i - MAP_WIDTH * BYTE_SIZE);
					const pieceTwo = data.readUInt32LE(i - MAP_WIDTH * 2 * BYTE_SIZE);
					const pieceThree = data.readUInt32LE(i - MAP_WIDTH * 3 * BYTE_SIZE);
					let pieceSeven;

					if (i - MAP_WIDTH * 7 * BYTE_SIZE >= 0) {
						pieceSeven = data.readUInt32LE(i - MAP_WIDTH * 7 * BYTE_SIZE);
					}

					if (
						pieceOne === PILLAR_SHADOW_TILE_ONE &&
						pieceTwo === PILLAR_SHADOW_TILE_TWO &&
						pieceThree === PILLAR_SHADOW_TILE_TWO
					) {
						backgroundData.writeUInt32LE(shadow, i - rs);
						backgroundData.writeUInt32LE(shadow, i - rs + 1 * BYTE_SIZE);

						backgroundData.writeUInt32LE(shadow, i - rs * 2);
						backgroundData.writeUInt32LE(shadow, i - rs * 2 + 1 * BYTE_SIZE);

						if (pieceSeven === PILLAR_SHADOW_TOP_RIGHT_CORNER_TILE) {
							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 3);
							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 3 + 1 * BYTE_SIZE);

							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 4);
							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 4 + 1 * BYTE_SIZE);

							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 5);
							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 5 + 1 * BYTE_SIZE);

							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 6);
							backgroundData.writeUInt32LE(FLOOR_TILE, i - rs * 6 + 1 * BYTE_SIZE);
						}
					}
				}
			}
		}
	}
};

GetWalkableTiles();

const AddFloorProps = () => {
	for (let i = 0, index = 0; index < walkableArray.length; i += BYTE_SIZE, index++) {
		const tile = walkableArray[index];
		const occupied = propsData.readUInt32LE(i);

		if (tile && Math.random() <= FLOOR_SHIT_CHANCE && !occupied) {
			const sand = Math.random() <= SAND_CHANCE;

			if (sand) {
				propsData.writeUInt32LE(SAND_DUNE_TILE, i);
			} else {
				propsData.writeUInt32LE(
					GROUND_TILE_VARIATIONS[getRandomIntInclusive(0, GROUND_TILE_VARIATIONS.length - 1)],
					i,
				);
			}
		}
	}
};

AddFloorProps();

const newData = zlib.deflateSync(new Buffer.from(data)).toString('base64');
const newBackgroundData = zlib.deflateSync(new Buffer.from(backgroundData)).toString('base64');
const newPropsData = zlib.deflateSync(new Buffer.from(propsData)).toString('base64');

InjectIntoXML(newBackgroundData, newData, newPropsData);

/**
 * 842 = TOP_LEFT
 * 843 = TOP
 * 844 = TOP_RIGHT
 * 845 = TOP_LEFT_DOT
 * 846 = TOP_RIGHT_DOT
 * 854 = LEFT
 * 855 = MIDDLE_BLACK
 * 856 = RIGHT
 * 857 = BOTTOM_LEFT_DOT
 * 858 = BOTTOM_RIGHT_DOT
 * 866 = BOTTOM_LEFT
 * 867 = BOTTOM
 * 868 = BOTTOM_RIGHT
 *
 * 861 = PATH_WAY
 *
 * 1053 = SHADOW
 */
