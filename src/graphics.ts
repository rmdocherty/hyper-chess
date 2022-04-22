import { g } from './game'
import { NORM_BOARD_HEIGHT, NORM_BOARD_WIDTH } from './board'
import { WHOLE_BOARD_WIDTH, WHOLE_BOARD_HEIGHT, Square, Color, label_to_point, Point, Label } from './squares'
import { Piece } from './pieces'

type Pixel = number


const classic = {"bg": "#ebe5c0", "black": "#cab175", "white": "#e9daB5", 
          "black_active": "#bf8558", "white_active": "#e69f6a", "active": "#84a360", 
          "menu": "#a52a2a", "circle": "#3eb053"}

var colours = classic;

const canvas = document.getElementById("gameBoard") as HTMLCanvasElement;

const canvas_w: Pixel = window.innerWidth, canvas_h: Pixel = window.innerHeight;
const ctx = canvas.getContext("2d");
canvas.height = canvas_h;
canvas.width = canvas_w;


const SQ_W: Pixel = 50;

const whole_board_pixel_l: Pixel = (WHOLE_BOARD_WIDTH  + 5) * SQ_W;
const whole_board_pixel_h: Pixel = (WHOLE_BOARD_HEIGHT + 2) * SQ_W;
const x_offset_px: Pixel = Math.floor((canvas_w - whole_board_pixel_l) / 2);
const y_offset_px: Pixel = Math.floor((canvas_h - whole_board_pixel_h) / 2);

class Visual_Square {
    real_sq: Square;
    points: Array<number>;
    midpoint: Array<number>;
    type: string;
    bbox: Array<Array<number>>;
    constructor(real_square, points, midpoint, type) {
        this.real_sq = real_square;
        this.points = points;
        this.midpoint = midpoint;
        this.type = type; //or curved
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
        this.draw_text()
    }

    calc_centre_pads(obj_w: Pixel, obj_h: Pixel): Array<Pixel> {
        const x_diff: Pixel = this.bbox[3][0] - this.bbox[0][0];
        const y_diff: Pixel= this.bbox[3][1] - this.bbox[0][1];
        const x_pad: Pixel = this.bbox[0][0] +  (x_diff - obj_w) / 2;
        const y_pad: Pixel = this.bbox[0][1] + (y_diff - obj_h) / 2;

        const out: Array<Pixel> = [x_pad, y_pad]

        return out
    }

    draw_sprite(sprite_addr): void {
        const pads: Array<Pixel> = this.calc_centre_pads(SQ_W, SQ_W)
        const real_x: Pixel = this.midpoint[0] - SQ_W / 2
        const real_y: Pixel = this.midpoint[1] - SQ_W / 2
        ctx.drawImage(sprite_addr, 0, 0, 60, 60, real_x, real_y, SQ_W, SQ_W)
    }

    draw_circle(): void {
        let pads: Array<Pixel>  = this.calc_centre_pads(SQ_W, SQ_W)
        let real_x: Pixel = this.midpoint[0], real_y =this.midpoint[1]
        ctx.fillStyle = colours["circle"]
        ctx.beginPath();
        ctx.arc(real_x, real_y, SQ_W / 10, 0, 2 * Math.PI);
        ctx.fill();
    }

    draw_triangle(): void {

    }

    draw_text(): void {
        //let pads: Array<Pixel>  = this.calc_centre_pads(SQ_W, SQ_W)
        let real_x: Pixel = this.midpoint[0] 
        let real_y: Pixel = this.midpoint[1] 
        ctx.fillStyle = "black"
        
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
            let blx: Pixel = x_offset_px + ix * SQ_W
            let bly: Pixel = y_offset_px + iy * SQ_W 
            let points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
            const midpoint = [blx + SQ_W / 2, bly + SQ_W / 2]
            graphics_board[iy][ix] = new Visual_Square(g.board[iy][ix], points, midpoint, "square")
        }
    }
    return graphics_board
}


function draw_board(graphics_board: VisualBoard): void{
    for (let row of graphics_board) {
        for (let g_sq of row) {
            if (g_sq.type == "curved"){
                //console.log("drawing curve")
            }
            g_sq.draw("default")
        }
    }
}

function draw_vector(vector: Array<Square>, graphics_board: VisualBoard, mode:string="default"): void {
    for (let sq of vector) {
        let x = sq.point.x, y= sq.point.y
        let gfx_sq: Visual_Square = graphics_board[y][x]

        /*
        if (mode == "default") {
            gfx_sq.draw("default")
        }
        else {
            gfx_sq.draw_circle()
        }
        */
        gfx_sq.draw(mode)
        
        const label: Label = sq.label
        if (g.LabelPiece.has(label)) {
            const piece: Piece = g.LabelPiece.get(label) as Piece
            gfx_sq.draw_sprite(piece.img)
        }
    }
}

function draw_pieces(graphics_board, LabelPieceMap): void{

    for (let [label, piece] of LabelPieceMap.LabelToPiece) {
        const point: Point = label_to_point(label)//piece.position
        
        const v_sq: Visual_Square = graphics_board[point.y][point.x]
        v_sq.draw_sprite(piece.img)
    }
}

function get_angles(loop: Array<Square>) : Array<Array<number>> {
    let angle: number = 180 / loop.length
    let total_angles = 100

    let all_angles : Array<Array<number>> = []

    for (let i = 0; i < loop.length; i++) {
        let angles: Array<number> = []
        for (let j = 0; j < total_angles; j++){
            angles.push(i * angle + j / total_angles)
        }         all_angles.push(angles)

   }
    return all_angles
}

function get_coords(angles: Array<Array<number>>, radii: Array<number>, anchor_loc: Array<number>): any { //Array<Array<Point>, Array<number>>
    const [r1, r2] = radii
    const [ax, ay] = anchor_loc
    let r1_points: Array<Point> = []
    let r2_points: Array<Point> = []

    // Compue midpoint
    const len: number = angles.length-1
    const mid_angle: number = angles[len][angles[len].length-1] - angles[0][0]
    const xm: number = ax + r2/r1 * Math.cos(mid_angle)
    const ym: number = ay + r2/r1 * Math.sin(mid_angle)


    for(let angle of angles){
        for (let subangle of angle) {
            let rad: number = subangle * Math.PI / 180
            let x1: number = ax + r1 * Math.cos(rad)
            let y1: number = ay + r1 * Math.sin(rad)
            let x2: number = ax + r2 * Math.cos(rad)
            let y2: number = ay + r2 * Math.sin(rad)
            //console.log(rad)
            r1_points.push(new Point(x1, y1))
            r2_points.push(new Point(x2, y2))
        }
    }
    
    r2_points = r2_points.reverse()
    const points: Array<Point> = r1_points.concat(r2_points)
    return [points, [xm, ym]]
}

function compute_anchor(loop: Array<Point>) {
    const [startp, endp]: Array<Point> = [loop[0], loop[loop.length-1]]
    const dx: number = endp.x - startp.x, dy: number = endp.y - startp.y
    

}




var visual_board: VisualBoard = []
var currently_highlighted = []

window.onload = function() {
    visual_board = fill_canvas_bg()
    visual_board = fill_canvas_norm(visual_board)
    for (let l of g.board.loops){
        for (let ls of l[3]) {
            let blx = x_offset_px + ls.x * SQ_W
            let bly = y_offset_px + ls.y * SQ_W 
            let points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
            const midpoint = [blx + SQ_W / 2, bly + SQ_W / 2]
            visual_board[ls.y][ls.x] = new Visual_Square(g.board[ls.y][ls.x], points, midpoint, "square")
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
            if ((x < max_p[0] && x > min_p[0]) && (y < max_p[1] && y > min_p[1])) {
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
                    g.make_move(currently_highlighted[0], v_sq.real_sq)
                    draw_vector(currently_highlighted, visual_board, "default")
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