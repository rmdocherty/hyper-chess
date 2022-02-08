import * as brd from './board'
import * as sq from './squares'
import * as pc from './pieces'

export var base_game: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
var rook_test: string = "r7/8/8/8/8/8/8/8"
var string_to_piece = {"r": pc.Rook, "n": pc.Knight, "q": pc.Queen, "p": pc.Pawn, "k": pc.King, "b": pc.Bishop}



export class Game {
    //TODO: make this map lol
    PointToPiece: Map<number, pc.Piece>
    board: brd.Board
    white_pieces: Array<pc.Piece>
    black_pieces: Array<pc.Piece>
    enpassant_flag: Boolean
    enpassant_sq : sq.Square
    turn_counter: number
    game_state: number
    constructor(board: brd.Board) {
        this.board = brd.board
        this.white_pieces = []
        this.black_pieces = []
        this.PointToPiece = new Map<number, pc.Piece>();
        this.enpassant_flag = false
        this.turn_counter = 0
    }

    public print_board(): void{
        this.board
        //board.reverse()
        for (let row of this.board) {
            let out_row = []
            for (let current_sq of row) {
                let out_char = ""
                if (current_sq instanceof sq.Forbidden) {
                    out_char = "_"
                }
                else if (this.PointToPiece.has(current_sq.point.index)){
                    out_char = this.PointToPiece.get(current_sq.point.index).piece_char
                }
                else if (current_sq instanceof sq.Hyper) {
                    out_char = "H"
                }
                else {
                    out_char = (current_sq.color == "black") ? " " : " "
                }
                out_row.push(out_char)
            }
            console.log(out_row.join())
        }
    }

    public gen_from_fen(fen_str: string): void{
        //Generate piece from FEN notation string, white is upper case, black lower case. Ignore en passant and castle strings for now.
        let x = 3
        let y = 12
        for (let piece_str of fen_str) {
            let lower_case_str: string = piece_str.toLowerCase()
            let color: pc.Color = pc.Color.White
            if (lower_case_str == piece_str){
                color = pc.Color.Black
            }
    
            if (piece_str == "/") {
                y -= 1
                x = 3
            }
            else if (['r', 'p', 'q', 'b', 'k', 'n'].includes(lower_case_str)) {
                let point = new sq.Point(x, y)
                let piece_type = string_to_piece[lower_case_str]
                let piece = new piece_type(point, color)
                this.PointToPiece.set(point.index, piece)
                
                if (color == pc.Color.Black) {
                    this.black_pieces.push(piece)
                }
                else {
                    this.white_pieces.push(piece)
                }
                x += 1
            }
            else {
                x += parseInt(piece_str)
            }
        }
    }
    
    
    public check_square(square_to_check: sq.Square, color: pc.Color) : boolean{
        // Check if forbidden
        if (square_to_check instanceof sq.Forbidden) {
            return false
        }
        // Check if occupied by same colour
        let point = square_to_check.point
        if (this.PointToPiece.has(point.index)) {
            let piece = this.PointToPiece.get(point.index)
            if (piece.color == color) {
                return false
            }
        }
    
        // If occupied by different colour or square is empty:
        return true    
    }

    public hypersquare_check(piece, new_sq, valid_moves, mv){
        //recursive check to loop around hypersquares you haven't already visited
        
        let point = new_sq.point

        if (new_sq instanceof sq.Hyper && !this.PointToPiece.has(point.index) && !valid_moves.includes(new_sq)) {
            for (let link_point of new_sq.link_sqs) {
                valid_moves.push(new_sq)
                //invert move vector
                let inverted_mv = new pc.MoveVector(-1 * mv.x, -1 * mv.y)
                let link_sq = this.board[link_point.y][link_point.x]
                if (new_sq.invert) {
                    valid_moves = this.find_continuous_valid_moves(piece, link_sq, valid_moves, inverted_mv)
                }
                else {
                    valid_moves = this.find_continuous_valid_moves(piece, link_sq, valid_moves, mv)
                }
                
            }   
        }
        return valid_moves
    }
    
    public find_continuous_valid_moves(piece: pc.Piece, new_sq: sq.Square, valid_moves: Array<sq.Square>,
        mv: pc.MoveVector) : Array<sq.Square>
    {
        let quit: boolean = false
        while(!quit){
            //check if square is valid move and add that to valid moves
            let point = new_sq.point

            valid_moves = this.hypersquare_check(piece, new_sq, valid_moves, mv)

            if (this.check_square(new_sq, piece.color) && !valid_moves.includes(new_sq)) {
                valid_moves.push(new_sq)
            }

            
            //check if square occupied by ANYTHING or if the square is forbidden
            
            quit = this.PointToPiece.has(point.index) || new_sq instanceof sq.Forbidden
            if (!quit){ //need this to avoid overskipping
                new_sq = this.board[point.y + mv.y][point.x + mv.x]
            }
        }
        return valid_moves
    }
    
    public find_valid_moves(piece: pc.Piece) {
        // TODO: Handle castling
        let valid_moves: Array<sq.Square> = []
        let px: number = piece.position.x
        let py: number = piece.position.y
        //console.log(piece, piece.move_vectors)
        for (let mv of piece.move_vectors) {
            //if you start on hypersquare
            let current_sq = this.board[py][px]
            valid_moves = this.hypersquare_check(piece, current_sq, valid_moves, mv)

            let new_sq: sq.Square = this.board[py + mv.y][px + mv.x]
            if(piece.move_continuous){        
                valid_moves = this.find_continuous_valid_moves(piece, new_sq, valid_moves, mv)
            }
            else{
                //TODO: Handle pawns
                if (this.check_square(new_sq, piece.color)) {
                    valid_moves.push(new_sq)
                }
            }
        }
        if (piece instanceof pc.Pawn) {
            valid_moves = []
            let pawn = piece as pc.Pawn
            if (pawn.unmoved)  {
                let new_sq: sq.Square = (pawn.color != pc.Color.Black) ? this.board[py + 2][px] : this.board[py - 2][px]
                console.log(this.PointToPiece.has(new_sq.point.index))
                if (this.check_square(new_sq, pawn.color) && (!(this.PointToPiece.has(new_sq.point.index)))) {
                    valid_moves.push(new_sq)
                }
                new_sq = (pawn.color != pc.Color.Black) ? this.board[py + 1][px] : this.board[py - 1][px]
                if (this.check_square(new_sq, pawn.color) && (!(this.PointToPiece.has(new_sq.point.index)))) {
                    valid_moves.push(new_sq)
                }
            else {
                let new_sq: sq.Square = (pawn.color = pc.Color.Black) ? this.board[py + 1][px] : this.board[py - 1][px]
                if (this.check_square(new_sq, pawn.color) && (!(this.PointToPiece.has(new_sq.point.index)))) {
                    valid_moves.push(new_sq)
                }
            }
            for (let av of pawn.attack_vectors) {
                let new_sq: sq.Square = this.board[py + av.y][px + av.x]
                if (this.check_square(new_sq, pawn.color) && (this.PointToPiece.has(new_sq.point.index))) {
                    valid_moves.push(new_sq)
                }
            }
            }
        }
        if (piece instanceof pc.King) {
            let king = piece as pc.King
            if (king.unmoved) {
                let back_y = (king.color == pc.Color.Black) ? 3 : 12
                let right_mv = new pc.MoveVector(1,0)
                let left_mv = new pc.MoveVector(-1,0)

                let castling_moves = this.find_continuous_valid_moves(king, this.board[8][back_y], valid_moves, right_mv)
                if (!castling_moves.includes(this.board[10][back_y])) {
                    let pot_rook = this.PointToPiece.get(this.board[10][back_y].point.index)
                    if (pot_rook instanceof pc.Rook) {
                        let rook = piece as pc.Rook
                        if (rook.unmoved) {
                            valid_moves.push(this.board[9][back_y])          
                        }
                    }
                }

                castling_moves = this.find_continuous_valid_moves(king, this.board[6][back_y], valid_moves, left_mv)
                if (!castling_moves.includes(this.board[3][back_y])) {
                    let pot_rook = this.PointToPiece.get(this.board[3][back_y].point.index)
                    if (pot_rook instanceof pc.Rook) {
                        let rook = piece as pc.Rook
                        if (rook.unmoved) {
                            valid_moves.push(this.board[5][back_y])          
                        }
                    }                   
                }
            }
                
               
              //  if (this.check_square(this.board[8][back_y], king.color)) && 
            
        }
        return valid_moves
    }

    public make_move(old_sq: sq.Square, new_sq: sq.Square) {
        this.enpassant_flag = false
        let piece = this.PointToPiece.get(old_sq.point.index)
        console.log(piece)
        if (this.PointToPiece.get(new_sq.point.index) instanceof pc.King) {
            this.game_state = (piece.color == pc.Color.Black) ? -1 : 1
        }

        console.log(this.PointToPiece.get(new_sq.point.index))        
        this.PointToPiece.set(new_sq.point.index, piece)
        piece.position = new_sq.point
        console.log(this.PointToPiece.get(new_sq.point.index))  
        this.PointToPiece.delete(old_sq.point.index)
        console.log(this.PointToPiece.get(old_sq.point.index))  
        
        if (piece instanceof pc.King) {
            piece.unmoved = false
        }
        else if (piece instanceof pc.Pawn) {
            if(piece.unmoved){
                piece.move_vectors = [
                    new pc.MoveVector(0, piece.direction),
                ]
            }
            piece.unmoved = false
            if (Math.abs(new_sq.point.y - old_sq.point.y) == 2) {
                this.enpassant_flag = true
            }
            if ((new_sq.point.y == 5) || (new_sq.point.y == 12)) {
                piece = new pc.Queen(new_sq.point, piece.color)
                this.PointToPiece.set(new_sq.point.index, piece)
            }
            if (new_sq.point.x != old_sq.point.x) {
                this.PointToPiece.delete(this.enpassant_sq.point.index)
            }
        }
        else if (piece instanceof pc.Rook) {
            piece.unmoved = false
        }
        this.turn_counter++
    }
}


export var g = new Game(brd.board)
g.gen_from_fen(base_game)
// console.log(g.PointToPiece.get([3, 5]))
g.print_board()
let rook = g.black_pieces[0]
//console.log(g.black_pieces, g.white_pieces)
//console.log(g.find_valid_moves(rook))