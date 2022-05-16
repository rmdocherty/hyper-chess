import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares"
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares"
import { label_to_point } from "./squares"
import { Point, Align } from "./squares"

export var NORM_BOARD_WIDTH: number = 8;
export var NORM_BOARD_HEIGHT: number = 8;

type Row = Array<Square>;
type Loop = Array<Square>;

type EndChar = "s" | "l" | "c" | "a" | "n" | "f"
type LoopEnds = Hyper | Link | Arch | Circle;
type LoopType = "loop" | "pair" | "single"
export type LoopDesc = [Align, LoopType, EndChar, Array<Point>];

const CHAR_TO_LOOP = {"s": Hyper, "l": Link, "c": Circle, "a": Arch, "n": Square, "f": Forbidden, "h": Hyper};
//NB THIS IS DEIFNED LEFT TO RIGHT BOTTOM TO TOP I.E ASSUMES START AND END POINTS DEFINED THAT WAY
const ALIGN_TO_DIR = {"x": [-1,-1], "y": [1, 1], "t": [1, 1], "b": [1, -1]}


export class Board extends Array {
    base_w: number;
    base_h: number;
    base_board_inds: Array<number>;
    loops: Array<LoopDesc>;

    constructor(bw: number, bh: number, loop_str: string="") {
        super();
        this.base_w = bw;
        this.base_h = bh;

        const left_x_ind: number = Math.floor((WHOLE_BOARD_WIDTH - bw) / 2);
        const right_x_ind: number = left_x_ind + bw - 1;
        const bot_y_ind: number = Math.floor((WHOLE_BOARD_HEIGHT - bh) / 2);
        const top_y_ind: number = bot_y_ind + bh - 1;
        this.base_board_inds = [left_x_ind, bot_y_ind, right_x_ind, top_y_ind];
        
        this.loops = [];
        this.make_board(loop_str);
    }

    //========FILLS========

    background_obj(x: number, y:number): any {
        const p: Point = new Point(x, y);
        const current_sq: Forbidden = new Forbidden(p);
        return current_sq
    }
    
    fill_background(): void {
        //Fill board with forbidden squares to start
        for (let y=0; y<WHOLE_BOARD_HEIGHT; y++){
            let row = [];
            for (let x=0; x<WHOLE_BOARD_WIDTH; x++){
                const current_sq: any = this.background_obj(x, y);
                row.push(current_sq);
            }
            this.push(row);
        }
    }

    add_square(x: number, y: number): void {
        const p: Point = new Point(x, y);
        const current_sq: Square = new Square(p);
        this[y][x] = current_sq;
    }

    fill_base_board(base_board_indices: Array<number>): void {
        //Fill the middle of the board with normal squares that correspond to bw x bh rectangle
        const [lx, by, rx, ty]: Array<number> = base_board_indices; //this.base_board_inds
        // Need the +1s here to avoid undercounting by 1
        for (let y=by; y<ty+1; y++){
            for (let x=lx; x<rx+1; x++){
                this.add_square(x, y)
            }
        }
    }

    //========ADDITIONS========

    set_sq(sq: Square, set_loc: Point): void {
        this[set_loc.y][set_loc.x] = sq
    }

    get_sq(get_loc: Point): Square {
        return this[get_loc.y][get_loc.x]
    }

    add_pair(loop_desc: LoopDesc): void {
        const [align, _, end_chr, pair_locs]: LoopDesc = loop_desc;
        let end_type: any
        const [p0, p1] = pair_locs;
        let s0: Hyper
        let s1: Hyper
        if (["c", "a"].includes(end_chr)) {
            end_type = CHAR_TO_LOOP[end_chr]
            s0 = new end_type(p0, [p1], align);
            s1 = new end_type(p1, [p0], align);
        }
        else if (["s", "l", "n", "f", "h"].includes(end_chr)) {
            end_type = CHAR_TO_LOOP[end_chr]
            s0 = new end_type(p0, [p1]);
            s1 = new end_type(p1, [p0]);
        }
        else {
            throw new Error("Not a valid end type character")
        }
        this.set_sq(s0, p0);
        this.set_sq(s1, p1);
    }

    add_single(loop_desc: LoopDesc): void {
        const [align, _, end_chr, loc]: LoopDesc = loop_desc;
        const p0: Point = loc[0]
        const end_type: any = CHAR_TO_LOOP[end_chr]
        const s0: Square = new end_type(p0);
        this.set_sq(s0, p0);
    }

    //========PARSING========

    parse_loop_string(loop_string: string): Array<LoopDesc> {
        /*Given a string of form 'ha8b5%Ha4m9%Cl9f4', where % denotes new loops, get a list of 
        start/end points these correspond to. */
        const loop_str_units: Array<string> = loop_string.split('%');
        const loop_points: Array<LoopDesc> = loop_str_units.map(x => this.parse_loop_unit(x));
        return loop_points;
    }

    parse_loop_unit(loop_unit: string): LoopDesc {
        let align: Align
        if (["x", "y", "t", "b"].includes(loop_unit[0])) {
            align = loop_unit[0] as Align
        }
        else {
            throw new Error("Incorrect alignment, must be one of x, y, t, b")
        }
        
        const lower_case: EndChar = loop_unit[1].toLowerCase() as EndChar
        let pair_type: LoopType = (loop_unit[1] == lower_case) ? "pair" : "loop";
        //const end_type: LoopEnds = CHAR_TO_LOOP[lower_case];
    
        const x0: number = alphabet.indexOf(loop_unit[2]);
        const y0: number = alphabet.indexOf(loop_unit[3]);
        const p0: Point = new Point(x0, y0);
        if (loop_unit.length == 4) {
            pair_type = "single"
            return [align, pair_type, lower_case, [p0]];
        } 
        else if (loop_unit.length == 6){
            const x1: number = alphabet.indexOf(loop_unit[4]);
            const y1: number = alphabet.indexOf(loop_unit[5]);
            const p1: Point = new Point(x1, y1);
            return [align, pair_type, lower_case, [p0, p1]];
        }
        else {
            throw new Error("Loop unit incorrect size, must be length 4 or 6")
        }
    }

    //========LOOPS========

    make_loop(loop_string: string): void {
        const loop_descs: Array<LoopDesc> = this.parse_loop_string(loop_string);
        for (let desc of loop_descs) {
            if (desc[1] == "single") { //fix here to include alignments
                this.add_single(desc);
                this.loops.push(desc);
            }
            else if (desc[1] == "pair") {
                this.add_pair(desc);
                this.loops.push(desc);
            }
            else if (desc[1] == "loop"){
                let line_desc: LoopDesc = desc
                let line_points: Array<Point>
                if (desc[2] == "l") {
                    line_points = this.make_line(desc);
                }
                else if (desc[2] == "a") {
                    line_points = this.make_arch(desc);
                }
                else {
                    throw new Error("New loop type not yet implemented");
                }
                line_desc[3] = line_points;
                this.loops.push(line_desc); //problem here: 
            }
            else { //TODO: implement loops
                throw new Error("New loop types not yet implemented");
            }
            this.loops.push()
        }
    }

    make_board(loop_string: string): void {
        this.fill_background();
        this.fill_base_board(this.base_board_inds);
        if (loop_string.length > 0){
            this.make_loop(loop_string);
        }
    }

    make_line(loop_desc: LoopDesc) : Array<Point> {
        let points: Array<Point> = []
        const [startp, endp]: Array<Point> = loop_desc[3];
        const dx: Number = endp.x - startp.x
        // Add the line - loop across whole board, if already set don't set again
        for (let i=0; i<WHOLE_BOARD_HEIGHT; i++) {
            let p: Point
            if (dx == 0) {
                p = new Point(endp.x, i)
                const sq: Square = new Square(p)
                if (this[i][endp.x] instanceof Forbidden){
                    this[i][endp.x] = sq
                }
            }
            else {
                p = new Point(i, endp.y)
                const sq: Square = new Square(p)
                if (this[endp.y][i] instanceof Forbidden){
                    this[endp.y][i] = sq
                }
            }
            points.push(p)
        }
        // Now add endpoints
        let p0: Point, p1: Point
        if (dx == 0) {
            p0 = new Point(endp.x, 0)
            p1 = new Point(endp.x, WHOLE_BOARD_WIDTH-1)
            this.add_pair(["x", "pair", "s", [p0, p1]])
        }
        else {
            p0 = new Point(0, endp.y)
            p1 = new Point(WHOLE_BOARD_HEIGHT-1, endp.y)
            this.add_pair(["x", "pair", "s", [p0, p1]])
        }
        // Reset end points of array - works as we go from 0 to end in loop
        points[0] = p0
        points[points.length-1] = p1
        return points
    }

    make_diag(point: Point, L: number, dir: Array<number>, align: Align): Array<Square>{
        let squares: Array<Square> = []
        for (let i=0; i<Math.floor(L / 2)+1;i++){
            let x: number = point.x + dir[0] * i, y: number = point.y + dir[1] * i;
            let f_lx: number  = x + dir[0] * 1, f_ly: number  = y + dir[1] * 1;
            let b_lx: number  = x - dir[0] * 1, b_ly: number  = y - dir[1] * 1;
            const p: Point = new Point(x, y);
            const fp: Point = new Point(f_lx, f_ly);
            const bp: Point = new Point(b_lx, b_ly);
            let sq: Square;
            if (i==0) {
                sq = new Arch(p, [fp], align);
            }
            else {
                sq = new Link(p, [bp, fp]);
            }
            // SIDE EFFECT
            this[y][x] = sq;
            squares.push(sq)
        }
        return squares
    }

    remap_links(squares: Array<Square>) {
        const len: number = squares.length
        for (let i=0; i<len; i++) {
            let sq: Hyper = squares[i] as Hyper
            if (i==0) {
                sq.link_sqs = [squares[1].point]
            }
            else if (i==len-1){
                sq.link_sqs = [squares[i-1].point]
            }
            else {
                sq.link_sqs = [squares[i-1].point, squares[i+1].point]
            }
        }
    }

    make_arch(loop_desc: LoopDesc): Array<Point> {
        // Setup problem
        const [startp, endp]: Array<Point> = loop_desc[3];
        const align: Align = loop_desc[0]
        let dir: Array<number> = ALIGN_TO_DIR[align];
        // Lengths
        const dx: number = endp.x - startp.x, dy: number = endp.y - startp.y;
        const L: number = Math.max(Math.abs(dx), Math.abs(dy));
        // Create first half
        const first_half_squares: Array<Square> = this.make_diag(startp, L, dir, align)
        // Remap dir and create second half
        if (align == 'x' || align == 'y') {
            dir[1] = dir[1] * -1
        }
        else {
            dir[0] = dir[0] * -1
        }
        const second_half_squares: Array<Square> = this.make_diag(endp, L, dir, align)
        second_half_squares.reverse()
        let squares: Array<Square> = first_half_squares.concat(second_half_squares)
        if (L%2==0) {
            squares.splice(Math.floor(L/2), 1)
        }
        this.remap_links(squares)
        
        const points: Array<Point> = squares.map(s => s.point)

        return points
    }

}