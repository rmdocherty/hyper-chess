import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares";
import { label_to_point, x_y_to_label } from "./squares";
import { Point, Color, Vector } from "./squares";
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares";
import { Board } from "./board";
import { Piece, Pawn, Rook, Bishop, Knight, Queen, King } from "./pieces";

var base_game_FEN: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
var rook_test: string = "r7/8/8/8/8/8/8/8";
var string_to_piece = {"r": Rook, "n": Knight, "q": Queen, "p": Pawn, "k": King, "b": Bishop};

type Move = Square;

class LabelPieceMap {
    LabelToPiece: Map<string, Piece>; 
    PieceToLabel: Map<Piece, string>;
    constructor() {
        this.LabelToPiece = new Map<string, Piece>();
        this.PieceToLabel = new Map<Piece, string>();
    }

    get_piece(label: string): Piece | undefined{
        return this.LabelToPiece.get(label);
    }

    get_label(piece: Piece): string | undefined {
        return this.PieceToLabel.get(piece);
    }

    set(label: string, piece: Piece): void {
        this.LabelToPiece.set(label, piece);
        this.PieceToLabel.set(piece, label);
    }

    has_label(label: string): boolean {
        return this.LabelToPiece.has(label);
    }

    has_piece(piece: Piece): boolean {
        return this.PieceToLabel.has(piece);
    }

    delete_label(label: string): void {
        const piece: Piece = this.LabelToPiece.get(label)
        this.LabelToPiece.delete(label);
        this.PieceToLabel.delete(piece);
    }

    delete_piece(piece: Piece): void {
        const label: string = this.PieceToLabel.get(piece)
        this.LabelToPiece.delete(label);
        this.PieceToLabel.delete(piece);
    }
}


export class Game {
    LabelToPiece: LabelPieceMap
    board: Board;
    enpassant_flag: Boolean;
    enpassant_sq : Square;
    turn_counter: number;
    game_state: number;
    constructor(bw: number, bh: number, loop_str: string = "", fen_str: string = "") {
        this.board = new Board(bw, bh, loop_str);
        this.LabelToPiece = new LabelPieceMap();
        this.enpassant_flag = false;
        this.turn_counter = 0;
        this.game_state = 0;
        this.gen_from_fen(fen_str);
    }

    gen_from_fen(fen_str: string): void {
        let x = this.board.base_w;
        let y = this.board.base_h;
        for (let piece_str of fen_str) {
            let lower_case_str: string = piece_str.toLowerCase();
            let color: Color = "white";
            if (lower_case_str == piece_str){
                color  = "black";
            }
    
            if (piece_str == "/") {
                y -= 1;
                x = 3;
            }
            else if (['r', 'p', 'q', 'b', 'k', 'n'].includes(lower_case_str)) {
                const piece_type = string_to_piece[lower_case_str];
                const piece: Piece = new piece_type(color);
                const label: string = x_y_to_label(x, y);
                this.LabelToPiece.set(label, piece);
                x += 1
            }
            else {
                x += parseInt(piece_str);
            }
        }
    }

    check_if_sq_empty(chk_sq: Square) : boolean{
        // Check if square occupied by anything
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        const label: string = chk_sq.label;
        if (this.LabelToPiece.has_label(label)) {
            return false;
        }
        return true;
    }

    check_if_square_takeable(chk_sq: Square, color: Color) : boolean {
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        const label: string = chk_sq.label;
        if (this.LabelToPiece.has_label(label)) {
            const piece: Piece = this.LabelToPiece.get_piece(label);
            if (piece.color == color) {
                return false;
            }
        }
        return true;
    }

    public find_valid_moves(piece: Piece): Array<Move> {
        let valid_moves: Array<Square> = [];

        for (let mv of piece.move_vectors) {
            const current_sq_label: string = this.LabelToPiece.get_label(piece);
            const current_point: Point = label_to_point(current_sq_label);
            const current_sq: Square = this.board.get_square(current_point)
            if (piece.move_continuous == true) {
                valid_moves = this.raycast(piece, current_sq, mv, valid_moves);
            }
            else {
                const new_point: Point = {"x": current_point.x + mv.x, "y": current_point.y + mv.y}
                const new_sq: Square = this.board.get_square(new_point)
                if (this.check_if_square_takeable(new_sq, piece.color)) {
                    valid_moves.push(new_sq)
                }
            }
        }
        return valid_moves
    }

    raycast(piece: Piece, start_sq: Square, mv: Vector, valid_moves: Array<Move>): Array<Move> {
        let current_sq: Square = start_sq;
        let quit: boolean = false;
        while (quit == false) {
            valid_moves = this.hypersquare_check(piece, current_sq, mv, valid_moves)

            if (this.check_if_sq_empty(current_sq)) {
                valid_moves.push(current_sq)
            }
            else if (this.check_if_square_takeable(current_sq, piece.color)){
                valid_moves.push(current_sq)
                // Set quit to true here so we can't skip over opponent's pieces
                quit = true
            }
            else {
                quit = true
            }
            // Only update square if you've not hit a forbidden square - will we get out of range error at some point?
            if (quit == false) {
                const p = current_sq.point
                current_sq = this.board.get_square_by_x_y(p.x + mv.x, p.y + mv.y)
            }
        }


        return valid_moves
    }

}