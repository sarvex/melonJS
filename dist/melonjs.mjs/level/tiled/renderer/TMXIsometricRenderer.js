/*!
 * melonJS Game Engine - v15.1.5
 * http://www.melonjs.org
 * melonjs is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 * @copyright (C) 2011 - 2023 Olivier Biot (AltByte Pte Ltd)
 */
import Vector2d from '../../../math/vector2.js';
import pool from '../../../system/pooling.js';
import TMXRenderer from './TMXRenderer.js';
import TMXLayer from '../TMXLayer.js';

/**
 * @classdesc
 * an Isometric Map Renderder
 * @augments TMXRenderer
 */
 class TMXIsometricRenderer extends TMXRenderer {
    /**
     * @param {TMXTileMap} map - the TMX map
     */
    constructor(map) {
        super(
            map.cols,
            map.rows,
            map.tilewidth,
            map.tileheight
        );

        this.hTilewidth = this.tilewidth / 2;
        this.hTileheight = this.tileheight / 2;
        this.originX = this.rows * this.hTilewidth;
    }

    /**
     * return true if the renderer can render the specified layer
     * @ignore
     */
    canRender(layer) {
        return (
            (layer.orientation === "isometric") &&
            super.canRender(layer)
        );
    }

    /**
     * return the bounding rect for this map renderer
     * @ignore
     */
    getBounds(layer) {
        let bounds = layer instanceof TMXLayer ? pool.pull("Bounds") : this.bounds;
        bounds.setMinMax(
            0, 0,
            (this.cols + this.rows) * (this.tilewidth / 2),
            (this.cols + this.rows) * (this.tileheight / 2)
        );
        return bounds;
    }

    /**
     * return the tile position corresponding to the specified pixel
     * @ignore
     */
    pixelToTileCoords(x, y, v) {
        let ret = v || new Vector2d();
        return ret.set(
            (y / this.tileheight) + ((x - this.originX) / this.tilewidth),
            (y / this.tileheight) - ((x - this.originX) / this.tilewidth)
        );
    }

    /**
     * return the pixel position corresponding of the specified tile
     * @ignore
     */
    tileToPixelCoords(x, y, v) {
        let ret = v || new Vector2d();
        return ret.set(
            (x - y) * this.hTilewidth + this.originX,
            (x + y) * this.hTileheight
        );
    }

    /**
     * fix the position of Objects to match
     * the way Tiled places them
     * @ignore
     */
    adjustPosition(obj) {
        let tileX = obj.x / this.hTilewidth;
        let tileY = obj.y / this.tileheight;
        let isoPos = pool.pull("Vector2d");

        this.tileToPixelCoords(tileX, tileY, isoPos);

        obj.x = isoPos.x;
        obj.y = isoPos.y;

        pool.push(isoPos);
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTile(renderer, x, y, tmxTile) {
        let tileset = tmxTile.tileset;
        // draw the tile
        tileset.drawTile(
            renderer,
            ((this.cols - 1) * tileset.tilewidth + (x - y) * tileset.tilewidth >> 1),
            (-tileset.tilewidth + (x + y) * tileset.tileheight >> 2),
            tmxTile
        );
    }

    /**
     * draw the tile map
     * @ignore
     */
    drawTileLayer(renderer, layer, rect) {
        // cache a couple of useful references
        let tileset = layer.tileset;

        // get top-left and bottom-right tile position
        let rowItr = this.pixelToTileCoords(
            rect.pos.x - tileset.tilewidth,
            rect.pos.y - tileset.tileheight,
            pool.pull("Vector2d")
        ).floorSelf();
        let tileEnd = this.pixelToTileCoords(
            rect.pos.x + rect.width + tileset.tilewidth,
            rect.pos.y + rect.height + tileset.tileheight,
            pool.pull("Vector2d")
        ).ceilSelf();

        let rectEnd = this.tileToPixelCoords(tileEnd.x, tileEnd.y, pool.pull("Vector2d"));

        // Determine the tile and pixel coordinates to start at
        let startPos = this.tileToPixelCoords(rowItr.x, rowItr.y, pool.pull("Vector2d"));
        startPos.x -= this.hTilewidth;
        startPos.y += this.tileheight;

        /* Determine in which half of the tile the top-left corner of the area we
         * need to draw is. If we're in the upper half, we need to start one row
         * up due to those tiles being visible as well. How we go up one row
         * depends on whether we're in the left or right half of the tile.
         */
        let inUpperHalf = startPos.y - rect.pos.y > this.hTileheight;
        let inLeftHalf  = rect.pos.x - startPos.x < this.hTilewidth;

        if (inUpperHalf) {
            if (inLeftHalf) {
                rowItr.x--;
                startPos.x -= this.hTilewidth;
            }
            else {
                rowItr.y--;
                startPos.x += this.hTilewidth;
            }
            startPos.y -= this.hTileheight;
        }

        // Determine whether the current row is shifted half a tile to the right
        let shifted = inUpperHalf ^ inLeftHalf;

        // initialize the columItr vector
        let columnItr = rowItr.clone();

        // main drawing loop
        for (let y = startPos.y * 2; y - this.tileheight * 2 < rectEnd.y * 2; y += this.tileheight) {
            columnItr.setV(rowItr);
            for (let x = startPos.x; x < rectEnd.x; x += this.tilewidth) {
                let tmxTile = layer.cellAt(columnItr.x, columnItr.y);
                // render if a valid tile position
                if (tmxTile) {
                    tileset = tmxTile.tileset;
                    // offset could be different per tileset
                    let offset  = tileset.tileoffset;
                    // draw our tile
                    tileset.drawTile(
                        renderer,
                        offset.x + x,
                        offset.y + y / 2 - tileset.tileheight,
                        tmxTile
                    );
                }

                // Advance to the next column
                columnItr.x++;
                columnItr.y--;
            }

            // Advance to the next row
            if (!shifted) {
                rowItr.x++;
                startPos.x += this.hTilewidth;
                shifted = true;
            }
            else {
                rowItr.y++;
                startPos.x -= this.hTilewidth;
                shifted = false;
            }
        }

        pool.push(columnItr);
        pool.push(rowItr);
        pool.push(tileEnd);
        pool.push(rectEnd);
        pool.push(startPos);
    }
}

export { TMXIsometricRenderer as default };
