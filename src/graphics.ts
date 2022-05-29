import { Game } from './game'
import { LoopDesc, Board } from './board'
import { WHOLE_BOARD_WIDTH, WHOLE_BOARD_HEIGHT, Square, Color, label_to_point, Point, Label, Forbidden, Align } from './squares'
import { Piece } from './pieces'
import * as geom from './geometry' 


export type Pixel = number;


let arch_pair_count: number = 1;
let line_pair_count: number = 1;

const classic = {"bg": "#ebe5c0", "black": "#cab175", "white": "#e9daB5", 
                "black_active": "#bf8558", "white_active": "#e69f6a", "active": "#84a360", 
                "menu": "#a52a2a", "circle": "#3eb053", "hyper_light": "#fce8b1",
                "hyper_dark": "#80765d"}

let colours = classic;

export const canvas = document.getElementById("gameBoard") as HTMLCanvasElement;

const canvas_w: Pixel = window.innerWidth, canvas_h: Pixel = window.innerHeight;
const ctx = canvas.getContext("2d");
canvas.height = canvas_h;
canvas.width = canvas_w;


const SQ_W: Pixel = 50;

class Visual_Square {
    real_sq: Square;
    points: Array<Array<number>>;
    midpoint: Array<number>;
    type: string;
    bbox: Array<Array<number>>;
    label: string;
    constructor(real_square, points, midpoint, type, label="") {
        this.real_sq = real_square;
        this.points = points;
        this.midpoint = midpoint;
        this.type = type; //or curved
        this.label = label;
        let x = points.map(p => p[0]);
        let y = points.map(p => p[1]);
        if (points.length > 2) {
            this.bbox = [
                [Math.min(...x), Math.min(...y)], 
                [Math.min(...x), Math.max(...y)], 
                [Math.max(...x), Math.min(...y)], 
                [Math.max(...x), Math.max(...y)]
            ];
        }
        else {
            this.bbox = [[0,0], [0,0], [0,0], [0,0]];
        }
    }

    draw(mode: string="default"): void {
        let fill_colour: string = colours[this.real_sq.color]    
        if (mode == "active"){
            fill_colour = colours[this.real_sq.color + "_active"]
        }
        ctx.fillStyle = fill_colour
        let p1: Array<number> = this.points[0]
        
        ctx.beginPath()
        ctx.moveTo(p1[0], p1[1])
        for (let p of this.points) {
            ctx.lineTo(p[0], p[1])
        }
        ctx.closePath()
        ctx.fill()

        if (this.type == "pair") {
            this.draw_label()
        }
        //this.draw_text()
    }

    calc_centre_pads(obj_w: Pixel, obj_h: Pixel): Array<Pixel> {
        const x_diff: Pixel = this.bbox[3][0] - this.bbox[0][0];
        const y_diff: Pixel= this.bbox[3][1] - this.bbox[0][1];
        const x_pad: Pixel = this.bbox[0][0] +  (x_diff - obj_w) / 2;
        const y_pad: Pixel = this.bbox[0][1] + (y_diff - obj_h) / 2;

        const out: Array<Pixel> = [x_pad, y_pad]

        return out
    }

    draw_sprite(sprite_addr, points: Array<Pixel>=[]): void {
        let x: Pixel, y: Pixel
        if (points.length > 0) {
            [x, y] = points
        }
        else {
            [x, y] = [this.midpoint[0]-SQ_W/2, this.midpoint[1]-SQ_W/2]
        }
        ctx.drawImage(sprite_addr, 0, 0, 60, 60, x, y, SQ_W, SQ_W)
    }

    draw_circle(): void {
        let real_x: Pixel = this.midpoint[0], real_y: Pixel =this.midpoint[1]
        ctx.fillStyle = colours["circle"]
        ctx.beginPath();
        ctx.arc(real_x, real_y, SQ_W / 10, 0, 2 * Math.PI);
        ctx.fill();
    }

    draw_triangle(): void {

    }

    draw_label(): void {
        let real_x: Pixel = this.midpoint[0];
        let real_y: Pixel = this.midpoint[1];
        ctx.fillStyle = (this.real_sq.color == "white") ? colours["black"] : colours["white"];
        const large_font_size: Pixel = 3 * (SQ_W / 5)
        ctx.font = String(large_font_size) + 'px arial';
        ctx.fillText(this.label[0], real_x - large_font_size/4, real_y + large_font_size/4);
        const small_font_size: Pixel = 1.5 * (SQ_W / 5)
        ctx.font = String(small_font_size) + 'px arial';
        ctx.fillText(this.label[1], real_x + large_font_size/3, real_y + large_font_size/2, SQ_W);
    }

    draw_text(): void {
        let real_x: Pixel = this.midpoint[0];
        let real_y: Pixel = this.midpoint[1];
        ctx.fillStyle = "black";
        
        ctx.fillText(this.real_sq.label, real_x, real_y);
    }

    remap_bbox(): Array<Array<number>> {
        const [p1, p2, p3, p4]: Array<Array<number>> = this.bbox
        return [p2, p1, p4, p3]
    }

    flip(flip_y: number): void {
        this.points = this.points.map(p => [p[0], flip_y-p[1]])
        this.bbox = this.bbox.map(p => [p[0], flip_y-p[1]])
        this.bbox = this.remap_bbox()
        this.midpoint = [this.midpoint[0], flip_y-this.midpoint[1]]
    }
}


class Visual_Square_Forbidden extends Visual_Square {
    constructor(real_square, points, midpoint, type) {
        super(real_square, points, midpoint, type);
    }

    draw(mode = "default"){
        return 0;
    }
}


export class Visual_Board extends Board {
    game: Game
    x_offset_px: Pixel
    y_offset_px: Pixel
    current_vec: Array<Square>
    constructor(game: Game){
        const bw: number = game.board.base_w, bh:number = game.board.base_h
        super(bw, bh)
        this.game = game
        const whole_board_pixel_l: Pixel = (WHOLE_BOARD_WIDTH  + 5) * SQ_W;
        const whole_board_pixel_h: Pixel = (WHOLE_BOARD_HEIGHT + 1) * SQ_W;
        this.x_offset_px = Math.floor((canvas_w - whole_board_pixel_l) / 2);
        this.y_offset_px = Math.floor((canvas_h - whole_board_pixel_h) / 2);
        this.base_board_inds = this.game.board.base_board_inds
        this.current_vec = []
    }

    make_board(loop_string: string): void {}

    flip_board(): void {
        const flip_y: number = this.y_offset_px + (WHOLE_BOARD_HEIGHT + 1) * SQ_W;
        this.forEach(row => row.forEach(sq => {sq.flip(flip_y)})) //square.flip(flip_y)
    }

    background_obj(x: number, y: number): any {
        const sq = new Visual_Square_Forbidden(this.game.board[y][x], [0, 0], [0, 0], "none")
        return sq
    }

    add_square(x: number, y: number, bbox: Array<Pixel>=[], points: Array<Array<Pixel>>=[], label: string=""): void {
        let midpoint: Array<Pixel>
        let blx: Pixel, bly: Pixel, urx: Pixel, ury: Pixel
        const board: Board = this.game.board
        const point: Point = new Point(x, y)
        
        if (points.length > 0) {
            [blx, bly] = this.point_to_pixel(point)
        }
        else if (bbox.length > 0) {
            [blx, bly, urx, ury] = bbox
            points = [[blx, bly], [urx, bly], [urx, ury], [blx, ury]]
        }
        else {
            [blx, bly] = this.point_to_pixel(point)
            points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
        }
        midpoint = [blx + SQ_W / 2, bly + SQ_W / 2]
        if (label == "") {
            this[y][x] = new Visual_Square(board[y][x], points, midpoint, "square")
        }
        else {
            this[y][x] = new Visual_Square(board[y][x], points, midpoint, "pair", label)
        }
    }

    add_squares(loop_points: Array<Point>): void {
        for (let ls of loop_points) {
            this.add_square(ls.x, ls.y)
        }
    }

    add_loop_squares(loop_desc: LoopDesc): void {
        const points: Array<Point> = loop_desc[3];
        const [anchor, delta] = this.compute_anchor(points, loop_desc[0]);
        const radii: Array<number> = [(delta-1)/2, (delta+1)/2]
        const loop_angle: number = (loop_desc[2] == 'a') ? 180 : 270
        const angles: Array<Array<number>> = geom.get_angles(points, loop_angle)
        const base_board_indices: Array<number> = this.game.board.base_board_inds
        const [coords, midpoints] = geom.get_coords(angles, radii, anchor, loop_desc[0], SQ_W, base_board_indices)
        for (let i=0;i<coords.length;i++){
            const p: Point = points[i]
            this[p.y][p.x] = new Visual_Square(this.game.board[p.y][p.x], coords[i], midpoints[i], "curved")
        }
    }

    add_pair(loop_desc: LoopDesc): void {
        const label_str: string = loop_desc[2]
        let num: number
        if (loop_desc[2] == 'a') {
            num = arch_pair_count
            arch_pair_count += 1
        }
        else {
            num = line_pair_count
            line_pair_count += 1
        }
        const label: string = label_str + String(num)
        const points: Array<Point> = loop_desc[3]
        const [startp, endp]: Array<Point> = [points[0], points[1]]
        this.add_square(startp.x, startp.y, [], [], label)
        this.add_square(endp.x, endp.y, [], [], label)
    }

    add_line_squares(loop_desc: LoopDesc): void {
        const rhs_p: Point = loop_desc[3][0]
        let [rx, ry]: Array<Pixel> = this.point_to_pixel(rhs_p)
        const lhs_p: Point = loop_desc[3][loop_desc[3].length - 1]
        let [lx, ly]: Array<Pixel> = this.point_to_pixel(lhs_p)
        let l_points: Array<Array<Pixel>>, r_points: Array<Array<Pixel>>
        if (loop_desc[0] == 'y') {
            r_points = [[rx, ry], [rx+SQ_W/2, ry-SQ_W], [rx+SQ_W, ry], [rx+SQ_W, ry+SQ_W], [rx, ry+SQ_W]]
            l_points = [[lx, ly], [lx+SQ_W, ly], [lx+SQ_W, ly+SQ_W], [lx+SQ_W/2, ly+2*SQ_W], [lx, ly+SQ_W]]
        }
        else {
            r_points = [[rx-SQ_W, ry+SQ_W/2], [rx, ry], [rx+SQ_W, ry],  [rx+SQ_W, ry+SQ_W], [rx, ry+SQ_W]]
            l_points = [[lx, ly], [lx+SQ_W, ly], [lx+2*SQ_W, ly+SQ_W/2], [lx+SQ_W, ly+SQ_W], [lx, ly+SQ_W]]
    
        }
        this.add_square(rhs_p.x, rhs_p.y, [], r_points)
        this.add_square(lhs_p.x, rhs_p.y, [], l_points)
        const rest_of_points: Array<Point> = loop_desc[3].slice(1, -1)
        this.add_squares(rest_of_points)
    }

    reset_board(): void{
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    draw_board(): void{
        for (let row of this) {
            for (let g_sq of row) {
                if (g_sq.type == "curved"){
                    g_sq.draw("default")
                }
                g_sq.draw("default")
            }
        }
    }

    draw_vector(vector: Array<Square>, mode:string="default"): void {
        for (let sq of vector) {
            let x: number = sq.x, y: number = sq.y
            let gfx_sq: Visual_Square = this[y][x]        
            gfx_sq.draw(mode);
            const label: Label = sq.label;
            if (this.game.LabelPiece.has(label)) {
                const piece: Piece = this.game.LabelPiece.get(label) as Piece;
                gfx_sq.draw_sprite(piece.img);
            }
        }
    }

    reset_current_vec(): void {
        this.draw_vector(this.current_vec, "default")
        this.current_vec = []
    }

    draw_pieces(LabelPieceMap): void{
        for (let [label, piece] of LabelPieceMap.LabelToPiece) {
            const point: Point = label_to_point(label);//piece.position
            const v_sq: Visual_Square = this[point.y][point.x];
            v_sq.draw_sprite(piece.img);
        }
    }

    compute_anchor(loop: Array<Point>, align: Align): any {
        const [startp, endp]: Array<Point> = [loop[0], loop[loop.length-1]];
        const offset = geom.ALIGN_TO_OFFSET[align]
        const dx: number = endp.x - startp.x, dy: number = endp.y - startp.y;
        const delta: number = Math.max(Math.abs(dx), Math.abs(dy))
        const x: number = startp.x + (dx+offset[0])/2
        const y: number = startp.y + (dy+offset[1])/2
        const real_x: Pixel = this.x_offset_px + x * SQ_W;
        const real_y: Pixel = this.y_offset_px + y * SQ_W;
        return [[real_x, real_y], delta];
    }

    point_to_pixel(point: Point): Array<Pixel> {
        return [this.x_offset_px + point.x * SQ_W,  this.y_offset_px + point.y * SQ_W]
    }

    make_visual_board() {
        this.fill_background()
        this.fill_base_board(this.base_board_inds)
        for (let l of this.game.board.loops){
            if (l[2] == 'a' && l[1] == "loop") {
                this.add_loop_squares(l)
            }
            else if (l[2] == 'l' && l[1] == "loop") {
                this.add_line_squares(l)
            }
            else if (l[1] == "pair") {
                this.add_pair(l)
            }
            else {
                this.add_squares(l[3])
            }
        }  
    }

    make_move_by_label(old_sq_label: string, new_sq_label: string): void{
        this.game.make_move_by_label(old_sq_label, new_sq_label)
        this.reset_current_vec()
        //this.draw_vector(this.current_vec, "default")
        //this.current_vec = []
    }
    
}
