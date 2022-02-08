

import {Point, Square, Forbidden, Hyper, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH, NORM_BOARD_HEIGHT, NORM_BOARD_WIDTH} from './squares'

export type Board = Array<Array<Square>> 
export var board: Board = []

export var loops: Array<Array<Square>> = []

export function fill_background(board: Board) : Board{
    //Fill board with forbidden squares to start
    for (let y=0; y<WHOLE_BOARD_HEIGHT; y++){
        let row = []
        for (let x=0; x<WHOLE_BOARD_WIDTH; x++){
            let p = new Point(x, y)
            let sq = new Forbidden(p)
            row.push(sq)
        }
        board.push(row)
    }
    return board
}

export function fill_normal_board(board: Board) : Board  {
    //Overwrite centre of board in 8x8 squares to make normal chessboard
    let start_x: number = 3
    let start_y: number = 5
    for (let y=start_y; y<start_y+NORM_BOARD_HEIGHT; y++){
        for (let x=start_x; x<start_x+NORM_BOARD_WIDTH; x++){
            let p = new Point(x, y)
            let sq = new Square(p)
            board[y][x] = sq
        }
    }
    return board
}

export function create_3_loop(board: Board, start_x: number, start_y: number, alignment: number) : Board {
    //Overwrite forbidden squares to create a 3 loop with direction set by alignment
    let start_p : Point = new Point(start_x, start_y)
    let middle_p : Point = new Point(start_x + alignment, start_y + 1)
    let end_p : Point = new Point(start_x, start_y+2)
    let p1: Square = new Hyper(start_p, [middle_p])
    let p2: Square = new Hyper(middle_p, [start_p, end_p], false)
    let p3: Square = new Hyper(end_p, [middle_p])
    board[start_p.y][start_p.x] = p1
    board[middle_p.y][middle_p.x] = p2
    board[end_p.y][end_p.x] = p3
    let loop: Array<Square> = [p1, p2, p3]
    loops.push(loop)
    return board
}

export function create_8_loop(board: Board) : Board {
    //adds both 8 loops in here
    let x_arr = [3,10]
    let y_arr = [2,13]

    let loop_top: Array<Square> = []
    let loop_bottom: Array<Square> = []
    

    for (let x of x_arr) {

        for (let y of y_arr) {
            let start_p = new Point(x,y)
            let middle_p = new Point(x,y+1)
            let end_p = new Point(x,y+2)
            let hyper_p = (y == 2) ? new Point(x, y-1) : new Point(x,y+3) 

            let p1 = new Square(start_p)
            let p2 = new Square(middle_p)
            let p3 = new Square(end_p)
            let p4 = new Hyper(hyper_p, [new Point((WHOLE_BOARD_WIDTH - hyper_p.x - 1), hyper_p.y)])
            board[start_p.y][start_p.x] = p1
            board[middle_p.y][middle_p.x] = p2
            board[end_p.y][end_p.x] = p3
            board[hyper_p.y][hyper_p.x] = p4
            // loop.push(p1, p2, p3, p4)
            for(let p of [p1, p2, p3, p4]){
                if (p.point.y < 5) {
                    loop_top.push(p)
                }
                else{
                    loop_bottom.push(p)
                }
            }
        }
        loops.push(loop_top, loop_bottom)

    }
    return board
}

export function add_8_loop(board: Board, start_x: number, start_y: number, alignment: number) {
    let opp_x = start_x + NORM_BOARD_WIDTH
    for (let x of [start_x, opp_x]) {
        let start_p = new Point(x,start_y)
        let middle_p = new Point(x,start_y+1*alignment)
        let end_p = new Point(x,start_y+2*alignment)
        
    }
}


export function add_loops(board: Board) : Board {
    let three_loop_pos: Array<Point> = [new Point(2, 5), new Point(2, 10), new Point(11, 5), new Point(11, 10)]
    for (let p=0; p<4; p++) {
        let point = three_loop_pos[p]
        let alignment: number = (p < 2) ? -1 : 1
        board = create_3_loop(board, point.x, point.y, alignment)
    }
    board = create_8_loop(board)
    return board
}

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

board = fill_background(board)
board = fill_normal_board(board)
board = add_loops(board)
//print_board(board)