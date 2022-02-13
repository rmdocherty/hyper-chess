import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares"
import { Point, Vector } from "./squares"
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares"

export var NORM_BOARD_WIDTH: number = 8;
export var NORM_BOARD_HEIGHT: number = 8;

type Row = Array<Square>;
type Loop = Array<Square>;
type PossibleLoops = "linex" | "liney" | "archx" | "archy" | "circleup" | "circledown";
type Dir = Array<-1 | 1>
type Align = ["x" | "y", "l" | "r" | "t" | "b"]

const hyper_board_str: string = "dedg%djdl%memg%mlmj%emlm%edld"
const hyper_with_line: string = "dedg%djdl%memg%mlmj%emlm%edld%dimi%dhmh"

export class Board {
    base_w: number;
    base_h: number;
    norm_board_inds: Array<number>;
    loops: Array<Loop>;
    squares: Array<Row>;
    constructor(bw: number, bh: number, loop_str: string = "") {
        //find indices s.t normal board sits in the middle of the whole board
        this.base_w = bw;
        this.base_h = bh;

        const left_x_ind: number = Math.floor((WHOLE_BOARD_WIDTH - bw) / 2);
        const right_x_ind: number = left_x_ind + bw - 1;
        const bot_y_ind: number = Math.floor((WHOLE_BOARD_HEIGHT - bh) / 2);
        const top_y_ind: number = bot_y_ind + bh - 1;
        this.norm_board_inds = [left_x_ind, bot_y_ind, right_x_ind, top_y_ind];

        //empty initialisations
        this.loops = [];
        this.squares = this.make_board(loop_str);
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
        for (let y=by; y<ty+1; y++){
            for (let x=lx; x<rx+1; x++){
                const p: Point = {"x": x, "y": y};
                const current_sq: Square = new Square(p);
                squares[y][x] = current_sq;
            }
        }
        return squares;
    }

    make_board(loop_str: string) : Array<Row>{
        let squares: Array<Row> = this.fill_background()
        squares = this.fill_normal_board(squares)
        if (loop_str != "") {
            squares = this.add_loops(squares, loop_str)
        }
        return squares
    }

    add_loops(squares: Array<Row>, loop_str: string) : Array<Row> {
        const all_loop_points: Array<Array<Point>> = this.parse_loop_string(loop_str)
        for (let loop_points of all_loop_points) {
            const sqs_to_add: Array<Square> = this.add_loop(loop_points)
            for (let sq of sqs_to_add) {
                const x: number = sq.point.x
                const y: number = sq.point.y
                squares[y][x] = sq
            }
        }
        return squares
    }

    parse_loop_unit(loop_unit: string) : Array<Point> {
        /*Given a 'unit' of a loop string i.e 'afed', split and map the characters to their position in 
        alphabet (and therefore index on the whole board). Make a point based on those and return.*/
        
        const x1: number = alphabet.indexOf(loop_unit[0]);
        const y1: number = alphabet.indexOf(loop_unit[1]);
        const p1: Point = {"x": x1, "y": y1};
    
        const x2: number = alphabet.indexOf(loop_unit[2]);
        const y2: number = alphabet.indexOf(loop_unit[3]);
        const p2: Point = {"x": x2, "y": y2};

        const loop_start_end: Array<Point> = [p1, p2];
        return loop_start_end;
    }

    parse_loop_string(loop_string: string) : Array<Array<Point>> {
        /*Given a string of form 'a8_b5%a4_m9%l9_f4', where % denotes new loops, get a list of 
        start/end points these correspond to. */
        const loop_str_units: Array<string> = loop_string.split('%');
        const loop_points: Array<Array<Point>> = loop_str_units.map(x => this.parse_loop_unit(x));
        return loop_points;
    }

    add_loop(loop_points: Array<Point>) : Array<Square> {
        /*Given the start and end loop points, find out which kind of loop it is (line, arch, circle)
        based on its dx, dy and whether it's directly on edge of board or not. */
        let loop_squares: Array<Square>;
        const [lx, by, rx, ty]: Array<number> = this.norm_board_inds;
        const p1: Point = loop_points[0], p2: Point = loop_points[1];
        const dx: number = p1.x - p2.x, dy: number = p1.y - p2.y;
        const on_left: boolean = (p1.x + 1 == lx) 
        const on_right: boolean = (p1.x - 1 == rx);
        const on_top: boolean = (p1.y + 1 == by)
        const on_bot: boolean = (p1.y - 1 == ty);
        console.log(this.norm_board_inds)
        console.log(p1.x, p1.y)
        console.log("dx: ", dx, "dy: ", dy, "L:", on_left, "R: ", on_right, "T: ", on_top, "B:", on_bot)

        let loop_type: PossibleLoops;
        if (dx == 0 && (on_top || on_bot)) {
            loop_type = "liney"; //for these 2 the second arg to align doesn't matter
            loop_squares = this.make_line(loop_points, dy, ["y", "t"]);
        }
        else if (dy == 0 && (on_left || on_right)) {
            loop_type = "linex";
            loop_squares = this.make_line(loop_points, dx, ["x", "t"]);
        }
        else if (dy != 0 && on_left) {
            loop_type = "archy";
            loop_squares = this.make_arch(loop_points, dy, ["y", "l"]);
        }
        else if (dy != 0 && on_right) {
            loop_type = "archy";
            loop_squares = this.make_arch(loop_points, dy, ["y", "r"]);
        }
        else if (dx != 0 && on_top) {
            loop_type = "archx";
            loop_squares = this.make_arch(loop_points, dx, ["x", "t"]);
        }
        else if (dx != 0 && on_bot) {
            loop_type = "archx";
            loop_squares = this.make_arch(loop_points, dx, ["x", "b"]);
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
        console.log(loop_type)
        return loop_squares;
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
        const a: string = align[0]
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
            if (a == "x") {
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
        if (a == "x") {
            start_hp = {"x": WHOLE_BOARD_WIDTH - 1, "y": start_p.y};
            end_hp = {"x": 0, "y": start_p.y};
        }
        else {
            start_hp = {"x": start_p.x, "y": WHOLE_BOARD_HEIGHT - 1};
            end_hp = {"x": start_p.x, "y": 0};
        }
         
        const right_hs: Hyper = new Hyper(start_hp, [end_hp]);
        const left_hs: Hyper = new Hyper(end_hp, [start_hp]);
        loop_squares.push(right_hs);
        loop_squares.push(left_hs);

        return loop_squares;
    } 

    make_diagonal (sx: number, sy: number, L: number, dir: Dir) : Array<Square>{
        const sqs: Array<Square> = [];
        for (let i=0; i<L; i++){
            let x: number, y: number;
            let f_lx: number, f_ly: number;
            let b_lx: number, b_ly: number;
            //error heere - need to be to determine which way x is going based on which side it is.
            x = sx + dir[0] * i, y = sy + dir[1] * i;
            f_lx = x + dir[0] * 1, f_ly = y + dir[1] * 1;
            b_lx = x - dir[0] * 1, b_ly = y - dir[1] * 1;
    
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

    map_align_to_dir(align: Align) : Dir {
        // y, l -> -1, 1   y, r -> 1, 1   x, b -> 1, 1   x, t -> 1, -1
        let dir: Dir = [1, 1];
        switch (align[1]) {
            case "l": 
                dir = [-1, 1];
                break;
            case "r": 
                dir = [1, 1];
                break;
            case "b":
                dir = [1, 1];
                break;
            case "t":
                dir = [1, -1];
                break;
            default:
                null;
        }
        return dir;
    }

    make_arch(loop_start_end: Array<Point>, delta: number, align: Align) : Array<Square>{
        /*TODO: get this working by calling make diagonal twice and adding in the correct 
        top of loop depending on dx parity. Also need to make it work for both x and y 
        in the same function.*/ 
        const L: number = Math.floor(Math.abs(delta) / 2) + 1;
        let start_p: Point;
        let end_p: Point;
        if (delta > 0) { //R <- L case
            [end_p, start_p] = loop_start_end;
        }
        else { // R - > L case
            [start_p, end_p] = loop_start_end;
        }
        const [sx, sy, ex, ey]: Array<number> = [start_p.x, start_p.y, end_p.x, end_p.y]
        
        let dir: Dir = this.map_align_to_dir(align);
        const first_half: Array<Square> = this.make_diagonal(sx, sy, L, dir);

        if (align[0] == "x") {
            dir[0] = -1;
        }
        else {
            dir[1] = -1;
        }

        const second_half: Array<Square> = this.make_diagonal(ex, ey, L, dir);
        const loop_squares: Array<Square> = first_half.concat(second_half);
        return loop_squares;
    }

    print_board() : void {
        //Print out string repr of the board so we know what's going on
        for (let iy=0; iy<this.squares.length; iy++) {
            let out_row = [alphabet[iy]]
            let row = this.squares[iy]
            for (let sq of row) {
                let out_char = ""
                if (sq instanceof Forbidden) {
                    out_char = "X"
                }
                else if (sq instanceof Link) {
                    out_char = "L"
                }
                else if (sq instanceof Arch) {
                    out_char = "A"
                }
                else if (sq instanceof Circle) {
                    out_char = "C"
                }
                else if (sq instanceof Hyper) {
                    out_char = "H"
                }
                else {
                    out_char = (sq.color == "black") ? "B" : "W"
                }
                out_row.push(out_char)
            }
            console.log(out_row.join(""))
        }
        console.log(" " + alphabet)
    }


}

const b = new Board(8, 8, hyper_with_line)
b.print_board()

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