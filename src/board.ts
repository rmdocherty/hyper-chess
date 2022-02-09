import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares"
import { Point, Vector } from "./squares"
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares"

export var NORM_BOARD_WIDTH: number = 8;
export var NORM_BOARD_HEIGHT: number = 8;

type Row = Array<Square>;
type Loop = Array<Square>;
type PossibleLoops = "linex" | "liney" | "archx" | "archy" | "circleup" | "circledown";

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

    fill_background() : Array<Row>{
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

    fill_normal_board(squares: Array<Row>) : Array<Row>{
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

    parse_loop_unit(loop_unit: string) : Array<Point>{
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

    parse_loop_string(loop_string: string) : Array<Array<Point>>{
        /*Given a string of form 'a8_b5%a4_m9%l9_f4', where % denotes new loops, get a list of 
        start/end points these correspond to. */
        const loop_str_units: Array<string> = loop_string.split('%');
        const loop_points: Array<Array<Point>> = loop_str_units.map(x => this.parse_loop_unit(x));
        return loop_points;
    }

    get_loop_type(loop_points: Array<Point>) : PossibleLoops{
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