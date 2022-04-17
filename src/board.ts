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
type LoopDesc = [Align, LoopType, EndChar, Array<Point>];

const CHAR_TO_LOOP = {"s": Hyper, "l": Link, "c": Circle, "a": Arch, "n": Square, "f": Forbidden, "h": Hyper};


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
    
    fill_background(): void {
        //Fill board with forbidden squares to start
        for (let y=0; y<WHOLE_BOARD_HEIGHT; y++){
            let row = [];
            for (let x=0; x<WHOLE_BOARD_WIDTH; x++){
                const p: Point = new Point(x, y);
                const current_sq: Forbidden = new Forbidden(p);
                row.push(current_sq);
            }
            this.push(row);
        }
    }

    fill_base_board(): void {
        //Fill the middle of the board with normal squares that correspond to bw x bh rectangle
        const [lx, by, rx, ty]: Array<number> = this.base_board_inds;
        // Need the +1s here to avoid undercounting by 1
        for (let y=by; y<ty+1; y++){
            for (let x=lx; x<rx+1; x++){
                const p: Point = new Point(x, y);
                const current_sq: Square = new Square(p);
                this[y][x] = current_sq;
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
            else { //TODO: implement loops
                throw new Error("New loop types not yet implemented");
            }
            this.loops.push()
        }
    }

    make_board(loop_string: string): void {
        this.fill_background();
        this.fill_base_board();
        if (loop_string.length > 0){
            this.make_loop(loop_string);
        }
    }

}