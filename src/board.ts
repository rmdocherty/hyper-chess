import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares"
import { Point, Vector } from "./squares"
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares"

export var NORM_BOARD_WIDTH: number = 8;
export var NORM_BOARD_HEIGHT: number = 8;

type Row = Array<Square>;
type Loop = Array<Square>;
type PossibleLoops = "linex" | "liney" | "archx" | "archy" | "circleup" | "circledown";
type Dir = -1 | 1
type Align = "x" | "y"

export class Board {
    base_w: number;
    base_h: number;
    norm_board_inds: Array<number>;
    loops: Array<Loop>;
    squares: Array<Row>;
    constructor(bw: number, bh: number) {
        //find indices s.t normal board sits in the middle of the whole board
        this.base_w = bw;
        this.base_h = bh;

        const left_x_ind: number = Math.floor((WHOLE_BOARD_WIDTH - bw) / 2) - 1;
        const right_x_ind: number = left_x_ind + this.base_w;
        const bot_y_ind: number = Math.floor((WHOLE_BOARD_HEIGHT - bh) / 2) - 1;
        const top_y_ind: number = bot_y_ind + this.base_h;
        this.norm_board_inds = [left_x_ind, bot_y_ind, right_x_ind, top_y_ind];

        //empty initialisations
        this.loops = [];
        this.squares = [];
    }

    fill_background() : Array<Row> {
        //Fill board with forbidden squares to start
        const squares: Array<Row> = [];
        for (let y=0; y<WHOLE_BOARD_HEIGHT; y++){
            let row = [];
            for (let x=0; x<WHOLE_BOARD_WIDTH; x++){
                const p: Point = {"x": x, "y": y};
                const current_sq: Forbidden = new Forbidden(p);
                row.push(current_sq);
            }
            squares.push(row);
        }
        return squares;
    }

    fill_normal_board(squares: Array<Row>) : Array<Row> {
        //Fill the middle of the board with normal squares that correspond to bw x bh rectangle
        const [lx, by, rx, ty]: Array<number> = this.norm_board_inds
        for (let y=by; y<ty; y++){
            for (let x=lx; x<rx; x++){
                const p: Point = {"x": x, "y": y};
                const current_sq: Square = new Square(p);
                squares[y][x] = current_sq;
            }
        }
        return squares;
    }

    parse_loop_unit(loop_unit: string) : Array<Point> {
        /*Given a 'unit' of a loop string i.e 'a8_b5', split at underscore and map the first
        character to its position in alphabet (and therefore index on the whole board) and
        parse the second part (a string of length 1 or 2 representing a number) as the other
        index. Make a point based on those and return.*/
        const loop_strs: Array<string> = loop_unit.split('_');
        const loop_start_end: Array<Point> = [];
        for (let str of loop_strs) {
            //we know first char of any string will be string in a..p
            const x: number = alphabet.indexOf(str[0]);
            //variable length int represented as string
            const y: number = parseInt(str.slice(1));
            const p: Point = {"x": x, "y": y};
            loop_start_end.push(p);
        }
        return loop_start_end;
    }

    parse_loop_string(loop_string: string) : Array<Array<Point>> {
        /*Given a string of form 'a8_b5%a4_m9%l9_f4', where % denotes new loops, get a list of 
        start/end points these correspond to. */
        const loop_str_units: Array<string> = loop_string.split('%');
        const loop_points: Array<Array<Point>> = loop_str_units.map(x => this.parse_loop_unit(x));
        return loop_points;
    }

    get_loop_type(loop_points: Array<Point>) : PossibleLoops {
        /*Given the start and end loop points, find out which kind of loop it is (line, arch, circle)
        based on its dx, dy and whether it's directly on edge of board or not. */
        const [lx, by, rx, ty]: Array<number> = this.norm_board_inds;
        const p1: Point = loop_points[0], p2: Point = loop_points[1];
        const dx: number = p1.x - p2.x, dy: number = p1.y - p2.y;
        const on_x_side = (p1.x + 1 == lx) || (p1.x - 1 == rx);
        const on_y_side = (p1.y + 1 == by) || (p1.y - 1 == ty);

        let loop_type: PossibleLoops;
        if (dx == 0 && on_y_side) {
            loop_type = "liney";
        }
        else if (dy == 0 && on_x_side) {
            loop_type = "linex";
        }
        else if (dx != 0 && on_y_side) {
            loop_type = "archy";
        }
        else if (dy != 0 && on_x_side) {
            loop_type = "archx";
        }
        else if (dy < 0 && dx != 0) {
            loop_type = "circledown";
        }
        else if (dy > 0 && dx != 0) {
            loop_type = "circledown";
        }
        else {
            throw new Error("Invalid looping!");
        }
        return loop_type;
    }

    make_line(loop_start_end: Array<Point>, delta: number, align: Align) : Array<Square>{
        /*Given start and end points of the line - draw a line between those points then 
        add in hypersquares connecting either ends of the line. If we make sure we start on the
        top (in y case) or right (in x case), we can safely just loop by incrementing over
        the distance and taking the modulo. After filling in the lin by pushin squares to the
        list, we replace the start and end of the list with the appopriate Hyper squares.*/
        let loop_squares: Array<Square> = []
        let start_p: Point;
        let end_p: Point;
        //
        if (delta < 0) { //L -> R case
            [end_p, start_p] = loop_start_end;
        }
        else { // R - > L case
            [start_p, end_p] = loop_start_end;
        }
        const dist: number = Math.abs(delta);
        //fill in the line first
        for (let i=0; i<dist; i++) { 
            let p: Point;
            if (align == "x") {
                const x : number = (start_p.x + i) % WHOLE_BOARD_WIDTH;
                p = {"x": x, "y": start_p.y};
            }
            else {
                const y : number = (start_p.y + i) % WHOLE_BOARD_HEIGHT;
                p = {"x": start_p.x, "y": y};
            }
            loop_squares.push(new Square(p));
        }
        //add in hyper squares
        let start_hp: Point;
        let end_hp: Point;
        if (align == "x") {
            start_hp = {"x": WHOLE_BOARD_WIDTH - 1, "y": start_p.y};
            end_hp = {"x": 0, "y": start_p.y};
        }
        else {
            start_hp = {"x": start_p.x, "y": WHOLE_BOARD_HEIGHT - 1};
            end_hp = {"x": start_p.x, "y": 0};
        }
         
        const right_hs: Hyper = new Hyper(start_hp, [end_hp]);
        const left_hs: Hyper = new Hyper(end_hp, [start_hp]);
        loop_squares[0] = right_hs;
        loop_squares[-1] = left_hs;

        return loop_squares;
    } 

    make_diagonal (sx: number, sy: number, L: number, align: Align, dir: Dir) : Array<Square>{
        const sqs = [];
        for (let i=0; i<L; i++){
            let x: number, y: number;
            let f_lx: number, f_ly: number;
            let b_lx: number, b_ly: number;
            if (align == "x") {
                 x = sx + dir * i, y = sy + i;
                 f_lx = x + dir * 1, f_ly = y + 1;
                 b_lx = x - dir * 1, b_ly = y - 1;
            }
            else {
                 x = sx + i, y = sy + dir * i;
                 f_lx = x + 1, f_ly = y + dir * 1;
                 b_lx = x + 1, b_ly = y - dir * 1;
            }
            const p : Point = {"x": x, "y": y};
            const fp : Point = {"x": f_lx, "y": f_ly};
            const bp : Point = {"x": b_lx, "y": b_ly};
            let sq: Square;
            if (i == 0){
                sq = new Arch(p, [fp], "x");
            }
            else {
                sq = new Link(p, [bp, fp]);
            }
            sqs.push(sq);
        }
        return sqs;
    }

    make_arch(loop_start_end: Array<Point>, dx: number, squares: Array<Row>) : Array<Row>{
        /*TODO: get this working by calling make diagonal twice and adding in the correct 
        top of loop depending on dx parity. Also need to make it work for both x and y 
        in the same function.*/ 
        let loop_squares: Array<Square> = []
        const L: number = Math.floor(Math.abs(dx) / 2)
        let start_p: Point;
        let end_p: Point;
        if (dx < 0) { //R <- L case
            [end_p, start_p] = loop_start_end;
        }
        else { // R - > L case
            [start_p, end_p] = loop_start_end;
        }
        const sx: number = start_p.x
        const sy: number = start_p.y
        


        return squares;
    }

}




/*
function print_board(board: Board) : void {
    //Print out string repr of the board so we know what's going on
    board.reverse()
    for (let row of board) {
        let out_row = []
        for (let sq of row) {
            let out_char = ""
            if (sq instanceof Forbidden) {
                out_char = "X"
            }
            else if (sq instanceof Hyper) {
                out_char = "H"
            }
            else {
                out_char = (sq.color == "black") ? "B" : "W"
            }
            out_row.push(out_char)
        }
        console.log(out_row.join())
    }
}
*/