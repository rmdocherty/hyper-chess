import { Game } from './game'
import { NORM_BOARD_HEIGHT, NORM_BOARD_WIDTH, LoopDesc } from './board'
import { WHOLE_BOARD_WIDTH, WHOLE_BOARD_HEIGHT, Square, Color, label_to_point, Point, Label, Forbidden, Align } from './squares'
import { Piece } from './pieces'
//import * as pr from './peerJS.js'


type Pixel = number;

const JSON_data: string = require("./games.json")
let g: Game;
function load_game_from_local_storage(){
    const selected_game: string = localStorage.getItem("selected_game")
    const game = JSON_data[selected_game]
    const h: number = parseInt(game['h']), w: number = parseInt(game['w'])
    const board_str: string = game['board_str']
    const FEN: string = game['FEN']
    g = new Game(w, h, board_str, FEN)
}
load_game_from_local_storage()

const ALIGN_TO_ORIENT = {"t": [-1, 0, 0, 1], "b": [-1, 0, 0, -1], "x": [0, -1, 1, 0], "y": [0, 1, 1, 0]};
const ALIGN_TO_OFFSET = {"t":[1, 0], "b": [1, 2], "x": [2, 1], "y": [0, 1]};

let arch_pair_count: number = 1;
let line_pair_count: number = 1;

const classic = {"bg": "#ebe5c0", "black": "#cab175", "white": "#e9daB5", 
                "black_active": "#bf8558", "white_active": "#e69f6a", "active": "#84a360", 
                "menu": "#a52a2a", "circle": "#3eb053", "hyper_light": "#fce8b1",
                "hyper_dark": "#80765d"}

var colours = classic;

const canvas = document.getElementById("gameBoard") as HTMLCanvasElement;

const canvas_w: Pixel = window.innerWidth, canvas_h: Pixel = window.innerHeight;
const ctx = canvas.getContext("2d");
canvas.height = canvas_h;
canvas.width = canvas_w;


const SQ_W: Pixel = 50;

const whole_board_pixel_l: Pixel = (WHOLE_BOARD_WIDTH  + 5) * SQ_W;
const whole_board_pixel_h: Pixel = (WHOLE_BOARD_HEIGHT + 1) * SQ_W;
const x_offset_px: Pixel = Math.floor((canvas_w - whole_board_pixel_l) / 2);
const y_offset_px: Pixel = Math.floor((canvas_h - whole_board_pixel_h) / 2);

class Visual_Square {
    real_sq: Square;
    points: Array<number>;
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
        let p1: number = this.points[0]
        
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
        const pads: Array<Pixel> = this.calc_centre_pads(SQ_W, SQ_W)
        let x: Pixel, y: Pixel
        if (points.length > 0) {
            [x, y] = points
        }
        else {
            [x, y] = [this.midpoint[0]-SQ_W/2, this.midpoint[1]-SQ_W/2]
        }
        //const real_x: Pixel = x - SQ_W / 2
        //const real_y: Pixel = y - SQ_W / 2
        ctx.drawImage(sprite_addr, 0, 0, 60, 60, x, y, SQ_W, SQ_W)
    }

    draw_circle(): void {
        let pads: Array<Pixel>  = this.calc_centre_pads(SQ_W, SQ_W)
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
        ctx.fillText(this.label[0], real_x-large_font_size/4, real_y+large_font_size/4);
        const small_font_size: Pixel = 1.5 * (SQ_W / 5)
        ctx.font = String(small_font_size) + 'px arial';
        ctx.fillText(this.label[1], real_x+large_font_size/3, real_y+large_font_size/2, SQ_W);
    }

    draw_text(): void {
        let real_x: Pixel = this.midpoint[0];
        let real_y: Pixel = this.midpoint[1];
        ctx.fillStyle = "black";
        
        ctx.fillText(this.real_sq.label, real_x, real_y);
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





type VisualBoard = Array<Array<Visual_Square>>


function fill_canvas_bg(): VisualBoard{
    let squares: VisualBoard = []
    for (let iy=0; iy<WHOLE_BOARD_HEIGHT; iy++) {
        let row: Array<Visual_Square> = []
        for (let ix=0; ix<WHOLE_BOARD_WIDTH; ix++){
            let sq = new Visual_Square_Forbidden(g.board[iy][ix], [0, 0], [0, 0], "none")
            row.push(sq)
        }
        squares.push(row)
    }
    return squares
}

function fill_canvas_norm(graphics_board: VisualBoard): VisualBoard{
    // this hardcoding is problem: need to use the base board inds of board obj to draw!
    const [lx, by, rx, ty]: Array<number> = g.board.base_board_inds;
    for (let iy=by; iy<ty+1; iy++){
        for (let ix=lx; ix<rx+1; ix++){
            add_square(g.board[iy][ix].point)
        }
    }
    return graphics_board
}


function draw_board(graphics_board: VisualBoard): void{
    for (let row of graphics_board) {
        for (let g_sq of row) {
            if (g_sq.type == "curved"){
                g_sq.draw("default")
            }
            g_sq.draw("default")
        }
    }
}

function draw_vector(vector: Array<Square>, graphics_board: VisualBoard, mode:string="default"): void {

    for (let sq of vector) {
        let x: number = sq.point.x, y: number = sq.point.y
        let gfx_sq: Visual_Square = graphics_board[y][x]

        /*
        if (mode == "default") {
            gfx_sq.draw("default")
        }
        else {
            gfx_sq.draw_circle()
        } 
        */
        
        gfx_sq.draw(mode);
        
        const label: Label = sq.label;
        if (g.LabelPiece.has(label)) {
            const piece: Piece = g.LabelPiece.get(label) as Piece;
            gfx_sq.draw_sprite(piece.img);
        }
    }
}

function draw_pieces(graphics_board, LabelPieceMap): void{
    for (let [label, piece] of LabelPieceMap.LabelToPiece) {
        const point: Point = label_to_point(label);//piece.position
        const v_sq: Visual_Square = graphics_board[point.y][point.x];
        v_sq.draw_sprite(piece.img);
    }
}

function get_angles(loop: Array<Point>, angle: number=180): Array<Array<number>> {
    let d_theta: number = angle / loop.length
    let total_angles: number = 200;
    let all_angles: Array<Array<number>> = [];

    for (let i = 0; i < loop.length; i++) {
        let angles: Array<number> = [];
        for (let j = 0; j < total_angles; j++){
            angles.push((i + j / total_angles) * d_theta )
        }         
        all_angles.push(angles);
   }
    return all_angles;
}

function get_coords(angles: Array<Array<number>>, radii: Array<number>, anchor_loc: Array<number>, align: Align): any {
    const [r1, r2] = radii;
    const [ax, ay] = anchor_loc;
    
    let midpoints = [];
    let curve_points = [];

    let flip: number = 1
    if ((align == 'x' || align == 'y')) {
        const b_inds = g.board.base_board_inds
        const mid_y: number =  b_inds[1] + (b_inds[3] - b_inds[1]) / 2
        if (ay / SQ_W > mid_y) {
            flip = -1
        }
    }

    // Compute midpoint
    const len: number = angles.length-1;
    
    for (let angle of angles){
        let orient = ALIGN_TO_ORIENT[align]
        const mid_angle: number = angle[0] + (angle[angle.length-1] - angle[0])/2;
        const mid_rad: number = mid_angle * Math.PI / 180;
        let xm: number = ax + (r1+0.5) * (orient[0] * Math.cos(mid_rad) + orient[1] * Math.sin(mid_rad)) * SQ_W;
        let ym: number = ay + (r1+0.5) * (orient[2] * flip * Math.cos(mid_rad) + orient[3] * flip * Math.sin(mid_rad)) * SQ_W;
        let r1_points = []; //type these later!
        let r2_points = [];
        midpoints.push([xm, ym])
        for (let subangle of angle) {
            let rad: number = subangle * Math.PI / 180;
            
            let x: number = orient[0] * Math.cos(rad) + orient[1] * Math.sin(rad)
            let y: number = orient[2] * Math.cos(rad) + orient[3] * Math.sin(rad)
            y *= flip

            let x1: number = ax + r1 * x * SQ_W;
            let y1: number = ay + r1 * y * SQ_W;
            let x2: number = ax + r2 * x * SQ_W;
            let y2: number = ay + r2 * y * SQ_W;

            r1_points.push([x1, y1]);
            r2_points.push([x2, y2]);
        }
        r2_points = r2_points.reverse();
        const points: Array<Point> = r1_points.concat(r2_points);
        curve_points.push(points)
    }
    
    return [curve_points, midpoints];
}

function compute_anchor(loop: Array<Point>, align: Align): any {
    const [startp, endp]: Array<Point> = [loop[0], loop[loop.length-1]];
    const offset = ALIGN_TO_OFFSET[align]
    const dx: number = endp.x - startp.x, dy: number = endp.y - startp.y;
    const delta: number = Math.max(Math.abs(dx), Math.abs(dy))
    const x: number = startp.x + (dx+offset[0])/2//Math.ceil(dx/2);
    const y: number = startp.y + (dy+offset[1])/2 //Math.ceil(dy/2);
    const real_x: Pixel = x_offset_px + x * SQ_W;
    const real_y: Pixel = y_offset_px + y * SQ_W;
    return [[real_x, real_y], delta];
}

function add_loop_squares(loop_desc: LoopDesc): void {
    const points: Array<Point> = loop_desc[3];
    const [anchor, delta] = compute_anchor(points, loop_desc[0]);
    const radii: Array<number> = [(delta-1)/2, (delta+1)/2]
    const loop_angle: number = (loop_desc[2] == 'a') ? 180 : 270
    const angles: Array<Array<number>> = get_angles(points, loop_angle)
    const [coords, midpoints] = get_coords(angles, radii, anchor, loop_desc[0])
    for (let i=0;i<coords.length;i++){
        const p: Point = points[i]
        visual_board[p.y][p.x] = new Visual_Square(g.board[p.y][p.x], coords[i], midpoints[i], "curved")
    }
}

function point_to_pixel(point: Point): Array<Pixel> {
    return [x_offset_px + point.x * SQ_W,  y_offset_px + point.y * SQ_W]
}

function add_square(point: Point, bbox: Array<Pixel>=[], points: Array<Array<Pixel>>=[], label: string=""): void {
    //let points: Array<Array<Pixel>>
    let midpoint: Array<Pixel>
    let blx: Pixel, bly: Pixel, urx: Pixel, ury: Pixel, midx: Pixel, midy: Pixel
    
    if (points.length > 0) {
        [blx, bly] = point_to_pixel(point)
    }
    else if (bbox.length > 0) {
        [blx, bly, urx, ury] = bbox
        points = [[blx, bly], [urx, bly], [urx, ury], [blx, ury]]
    }
    else {
        [blx, bly] = point_to_pixel(point)
        points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
    }
    midpoint = [blx + SQ_W / 2, bly + SQ_W / 2]
    if (label == "") {
        visual_board[point.y][point.x] = new Visual_Square(g.board[point.y][point.x], points, midpoint, "square")
    }
    else {
        visual_board[point.y][point.x] = new Visual_Square(g.board[point.y][point.x], points, midpoint, "pair", label)
    }
    
}

function add_squares(loop_points: Array<Point>): void {
    for (let ls of loop_points) {
        add_square(ls)
    }
}

function add_line_squares(loop_desc: LoopDesc): void {
    const rhs_p: Point = loop_desc[3][0]
    let [rx, ry]: Array<Pixel> = point_to_pixel(rhs_p)
    const lhs_p: Point = loop_desc[3][loop_desc[3].length - 1]
    let [lx, ly]: Array<Pixel> = point_to_pixel(lhs_p)
    let l_points: Array<Array<Pixel>>, r_points: Array<Array<Pixel>>
    if (loop_desc[0] == 'y') {
        r_points = [[rx, ry], [rx+SQ_W/2, ry-SQ_W], [rx+SQ_W, ry], [rx+SQ_W, ry+SQ_W], [rx, ry+SQ_W]]
        l_points = [[lx, ly], [lx+SQ_W, ly], [lx+SQ_W, ly+SQ_W], [lx+SQ_W/2, ly+2*SQ_W], [lx, ly+SQ_W]]
    }
    else {
        r_points = [[rx-SQ_W, ry+SQ_W/2], [rx, ry], [rx+SQ_W, ry],  [rx+SQ_W, ry+SQ_W], [rx, ry+SQ_W]]
        l_points = [[lx, ly], [lx+SQ_W, ly], [lx+2*SQ_W, ly+SQ_W/2], [lx+SQ_W, ly+SQ_W], [lx, ly+SQ_W]]

    }
    add_square(rhs_p, [], r_points)
    add_square(lhs_p, [], l_points)
    const rest_of_points: Array<Point> = loop_desc[3].slice(1, -1)
    add_squares(rest_of_points)
}

function add_pair(loop_desc: LoopDesc): void {
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
    add_square(points[0], [], [], label)
    add_square(points[1], [], [], label)
}

function gen_points_between_squares(v_sq1: Visual_Square, v_sq2: Visual_Square, N: number=100): Array<Array<Pixel>> {
    let points: Array<Array<Pixel>> = []
    // Draw straight line between midpoints
    const x0: Pixel = v_sq1.midpoint[0], y0: Pixel = v_sq1.midpoint[1]
    const dx: number = v_sq2.real_sq.point.x - v_sq1.real_sq.point.x
    const dy: number = v_sq2.real_sq.point.y - v_sq1.real_sq.point.y
    const magnitude: number = Math.sqrt(Math.pow(dx, 2) +  Math.pow(dy, 2))

    if (magnitude > 4) { // large jump (i.e across the board)
        const x1: Pixel = v_sq2.midpoint[0], y1: Pixel = v_sq2.midpoint[1]
        points = [[x0, y0], [x1, y1]]
    }
    else { //else smooth increase across line connecting midpoints
        const epsilon: number = 1/N
        for (let i=0; i<N; i++){
            const point: Array<Pixel> = [(x0+epsilon*i*dx)-SQ_W/2, (y0+epsilon*i*dy)-SQ_W/2]
            points.push(point)
        }
    }
    return points
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function animate_between_squares(initial_v_sq: Visual_Square, moved_piece: Piece, points: Array<Array<Pixel>>) {
    console.log(moved_piece)
    for (let s of points) {
        
        sleep(50).then(() => {
            initial_v_sq.draw_sprite(moved_piece.img, s)
            ctx.clearRect(s[0], s[1], SQ_W, SQ_W)
            draw_vector(currently_highlighted, visual_board, "default")
        })
        
    }
}

function animate(vector: Array<Square>, visual_board: VisualBoard, piece: Piece): void {
    const initial_sq: Square = vector[0]
    const initial_v_sq: Visual_Square = visual_board[initial_sq.point.y][initial_sq.point.x]
    // Animate by repeatedly calling draw sprite method of init square with new coords
    for (let i=1; i<vector.length; i++){
        const sq: Square = vector[i]
        const v_sq: Visual_Square = visual_board[sq.point.y][sq.point.x]

        const prev_sq: Square = vector[i-1]
        const prev_v_sq: Visual_Square = visual_board[prev_sq.point.y][prev_sq.point.x]

        const temp_points: Array<Array<Pixel>> = gen_points_between_squares(v_sq, prev_v_sq)
        //animate_between_squares(initial_v_sq, piece, temp_points)
    }
}



var visual_board: VisualBoard = []
var currently_highlighted: Array<Square> = []

window.onload = function() {
    visual_board = fill_canvas_bg()
    visual_board = fill_canvas_norm(visual_board)
    for (let l of g.board.loops){
        if (l[2] == 'a' && l[1] == "loop") {
            add_loop_squares(l)
        }
        else if (l[2] == 'l' && l[1] == "loop") {
            add_line_squares(l)
        }
        else if (l[1] == "pair") {
            add_pair(l)
        }
        else {
            add_squares(l[3])
        }
    }   
    draw_board(visual_board)
    draw_pieces(visual_board, g.LabelPiece)
}


canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect()
    const x: Pixel = e.clientX - rect.left
    const y: Pixel = e.clientY - rect.top

    check_click(x, y, visual_board)
})

function check_click(x: Pixel, y: Pixel, visual_board: VisualBoard): void{
    let on_board: boolean = false
    for (let row of visual_board){
        for (let v_sq of row) {
            let min_p = v_sq.bbox[0]
            let max_p = v_sq.bbox[3]
            if ((x < max_p[0] && x > min_p[0]) && (y < max_p[1] && y > min_p[1]) && !(v_sq.real_sq instanceof Forbidden)) {
                on_board = true
                const is_move: boolean = currently_highlighted.includes(v_sq.real_sq)
                if (currently_highlighted.length == 0){
                    currently_highlighted.push(v_sq.real_sq)
                }
                const label: Label = v_sq.real_sq.point.label
                const is_occupied: boolean = g.LabelPiece.has(label)
                
                if (is_occupied && currently_highlighted.length == 1) {
                    // PICKING A PIECE CASE
                    const piece: Piece = g.LabelPiece.get(label) as Piece
                    const moves: Array<Square> = g.find_valid_moves(piece)
                    currently_highlighted = currently_highlighted.concat(moves)
                }
                else if (is_move) {
                    // TAKE A PIECE
                    const piece: Piece = g.LabelPiece.get(currently_highlighted[0].label) as Piece
                    g.make_move(currently_highlighted[0], v_sq.real_sq)
                    draw_vector(currently_highlighted, visual_board, "default")
                    animate(currently_highlighted, visual_board, piece)
                    currently_highlighted = []
                }
            }
            
            
            if (g.global_update) { //problem here: after promotion queen img loads too slow to be displayed
                draw_board(visual_board)
                draw_pieces(visual_board, g.LabelPiece)
                g.global_update = false
            }
            else{
                draw_vector(currently_highlighted, visual_board, "active")
            }
            
        }
    }
    if (on_board == false) {
        draw_vector(currently_highlighted, visual_board, "default")
        currently_highlighted = []
    }
}