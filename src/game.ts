import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares";
import { label_to_point, x_y_to_label } from "./squares";
import { Point, Color, Vector } from "./squares";
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares";
import { Board } from "./board";
import { Piece, Pawn, Rook, Bishop, Knight, Queen, King } from "./pieces";

var base_game_FEN: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
var rook_test: string = "r7/8/8/8/8/8/8/8";
var string_to_piece = {"r": Rook, "n": Knight, "q": Queen, "p": Pawn, "k": King, "b": Bishop};

export class Game {
    LabelToPiece: Map<string, Piece>;
    board: Board;
    enpassant_flag: Boolean;
    enpassant_sq : Square;
    turn_counter: number;
    game_state: number;
    constructor(bw: number, bh: number, loop_str: string = "", fen_str: string = "") {
        this.board = new Board(bw, bh, loop_str);
        this.LabelToPiece = new Map<string, Piece>();
        this.enpassant_flag = false;
        this.turn_counter = 0;
        this.game_state = 0
        this.gen_from_fen(fen_str)
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
                x += parseInt(piece_str)
            }
        }
    }

    check_if_sq_empty(chk_sq: Square) : boolean{
        // Check if square occupied by anything
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        const label: string = chk_sq.label
        if (this.LabelToPiece.has(label)) {
            return false;
        }
        return true;
    }

    check_if_square_takeable(chk_sq: Square, color: Color) : boolean {
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        const label: string = chk_sq.label
        if (this.LabelToPiece.has(label)) {
            const piece: Piece = this.LabelToPiece.get(label);
            if (piece.color == color) {
                return false;
            }
        }
        return true;
    }

    public find_valid_moves(piece: Piece) {
        let valid_moves: Array<Square> = []
        // TODO: make an inverted version of map so we can find a piece's position
        // May be best to make a class that just copies the get/set/delete/has interface but automatically updates both directions.

        for (let mv of piece.move_vectors) {
            const current_sq = this.board.get_square()
        }
    }

}