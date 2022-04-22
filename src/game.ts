import { alphabet, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares";
import { label_to_point, x_y_to_label } from "./squares";
import { Point, Color, Vector, Label } from "./squares";
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares";
import { Board } from "./board";
import { Piece, Pawn, Rook, Bishop, Knight, Queen, King } from "./pieces";

/*Compilation:
    npm run build
    node chess-bundle.js (not currently working as Image() in pieces.ts not working for node - is working when live tho?)
    npx webpack serve
*/

var base_game_FEN: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
var test_line: string = "xLdhmh%yLgdgm"
var test_pair: string = "xadjdg"//"yaedgd" or %xamjmg%yagdjd
var hyper_board_str: string = "xAdfdk" //%xadldj%yagmim
var rook_test: string = "r3k/8/8/8/4p/8/5P/2R";
var string_to_piece = {"r": Rook, "n": Knight, "q": Queen, "p": Pawn, "k": King, "b": Bishop};

type Move = Square;

class LabelPieceMap {
    LabelToPiece: Map<Label, Piece>; 
    PieceToLabel: Map<Piece, Label>;
    constructor() {
        this.LabelToPiece = new Map<Label, Piece>();
        this.PieceToLabel = new Map<Piece, Label>();
    }

    get(x: Piece | Label): Label | Piece {
        if (x instanceof Piece) {
            const label: Label = this.PieceToLabel.get(x);
            return label
        }
        else {
            const piece: Piece = this.LabelToPiece.get(x);
            return piece
        }
    }

    set(label: string, piece: Piece): void {
        this.LabelToPiece.set(label, piece);
        this.PieceToLabel.set(piece, label);
    }

    has(x: Piece | Label): boolean {
        if (x instanceof Piece) {
            return this.PieceToLabel.has(x);
        }
        else {
            return this.LabelToPiece.has(x);
        }
    }

    delete(x: Piece | Label): void {
        let label: Label
        let piece: Piece
        if (x instanceof Piece) {
            label = this.PieceToLabel.get(x);
            piece = x;
        }
        else {
            piece = this.LabelToPiece.get(x);
            label = x;
        }
        this.LabelToPiece.delete(label);
        this.PieceToLabel.delete(piece);
    }
}


export class Game {
    LabelPiece: LabelPieceMap
    board: Board;
    enpassant_flag: Boolean;
    enpassant_sq : Square;
    turn_counter: number;
    game_state: number;
    hyper_tracker: Boolean;
    global_update: boolean
    constructor(bw: number, bh: number, loop_str: string = "", fen_str: string = "") {
        this.board = new Board(bw, bh, loop_str);
        this.LabelPiece = new LabelPieceMap();
        this.enpassant_flag = false;
        this.turn_counter = 0;
        this.game_state = 0;
        this.hyper_tracker = false;
        this.global_update = false;
        this.gen_from_fen(fen_str);
    }

    piece_to_square(piece: Piece): Square {
        const label: Label = this.LabelPiece.get(piece) as Label
        const point: Point = label_to_point(label)
        const sq: Square = this.board[point.y][point.x]
        return sq
    }

    gen_from_fen(fen_str: string): void {
        let x = this.board.base_board_inds[0];
        let y = this.board.base_board_inds[3];
        for (let piece_str of fen_str) {
            let lower_case_str: string = piece_str.toLowerCase();
            let color: Color = "white";
            if (lower_case_str == piece_str){
                color  = "black";
            }
    
            if (piece_str == "/") {
                y -= 1;
                x = this.board.base_board_inds[0];
            }
            else if (['r', 'p', 'q', 'b', 'k', 'n'].includes(lower_case_str)) {
                const piece_type = string_to_piece[lower_case_str];
                const piece: Piece = new piece_type(color);
                const label: string = x_y_to_label(x, y);
                this.LabelPiece.set(label, piece);
                x += 1
            }
            else {
                x += parseInt(piece_str);
            }
        }
    }

    check_if_sq_empty(chk_sq: Square, piece: Piece): boolean{
        // Check if square occupied by anything
        let label: string
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        try { // really lazy: this is in case we go out of bounds
            label = chk_sq.label;
        }
        catch (TypeError) {
            return false
        }
        
        if (this.LabelPiece.has(label)) {
            const other_piece: Piece = this.LabelPiece.get(label) as Piece;
            if (other_piece == piece) {
                return true;
            }
            return false;
        }
        return true;
    }

    check_if_square_takeable(chk_sq: Square, color: Color) : boolean {
        let label:string
        if (chk_sq instanceof Forbidden) {
            return false;
        }

        try {
            label = chk_sq.label;
        }
        catch (TypeError) {
            return false
        }

        label = chk_sq.label;
        if (this.LabelPiece.has(label)) {
            const piece: Piece = this.LabelPiece.get(label) as Piece;
            if (piece.color == color) {
                return false;
            }
        }
        return true;
    }

    public find_valid_moves(piece: Piece): Array<Move> {
        let valid_moves: Array<Square> = [];

        if (piece instanceof Pawn) {
            valid_moves = this.find_valid_pawn_moves(piece)
            return valid_moves
        }
        else if ((piece instanceof King) && (piece.unmoved == true)) {
            const castle_moves: Array<Square> = this.check_castling(piece)
            valid_moves = valid_moves.concat(castle_moves) 
        }

        for (let mv of piece.move_vectors) { //BUG: if we start on a hypersquare, the link sq is added for the first move vector and no others, so piece appears stuck!
            const current_sq_label: Label = this.LabelPiece.get(piece) as Label;
            const current_point: Point = label_to_point(current_sq_label);
            const current_sq: Square = this.board.get_sq(current_point)
            if (piece.move_continuous == true) {
                valid_moves = this.raycast(piece, current_sq, mv, valid_moves);
            }
            else {
                const new_point: Point = current_point.add(mv);
                const new_sq: Square = this.board.get_sq(new_point);
                if (this.check_if_square_takeable(new_sq, piece.color)) {
                    valid_moves.push(new_sq);
                }
            }
        }
        
        return valid_moves
    }

    check_castling(piece: King) {
        let valid_moves: Array<Square> = []
        const start_sq: Square = this.piece_to_square(piece)
        const mvs: Array<Vector> = [new Point(-1, 0), new Point(1, 0)]
        for (let m of mvs) {
            const sqs: Array<Square> = this.raycast(piece, start_sq, m, [])
            const last_sq: Square = sqs[sqs.length-1]
            
            const next_sq: Square = this.board[last_sq.point.y][last_sq.point.x + m.x]
            const next_piece: any = this.LabelPiece.get(next_sq.label)
            if ((next_piece instanceof Rook) && (next_piece.color == piece.color) && (next_piece.unmoved == true)) {
                const king_move_sq: Square = this.board[start_sq.point.y][start_sq.point.x + 2*m.x]
                valid_moves.push(king_move_sq)
            }
        }
        return valid_moves
    }

    find_valid_pawn_moves(piece: Pawn): Array<Move> {
        let valid_moves: Array<Square> = [];
        const current_label: Label = this.LabelPiece.get(piece) as Label
        const p: Point = label_to_point(current_label)
        const mv: Vector = piece.move_vectors[0]
        const [av1, av2] = piece.attack_vectors
        const s1: Square = this.board[p.y+mv.y][p.x]
        const s2: Square = this.board[p.y+2*mv.y][p.x]
        const atk1: Square = this.board[p.y+av1.y][p.x+av1.x]
        const atk2: Square = this.board[p.y+av2.y][p.x+av2.x]
        // Moves
        if (this.check_if_sq_empty(s1, piece)){
            valid_moves.push(s1)
        }
        if (piece.unmoved && this.check_if_sq_empty(s1, piece) && this.check_if_sq_empty(s2, piece)) {
            valid_moves.push(s2)
        }
        if ([atk1, atk2].includes(this.enpassant_sq)) {
            valid_moves.push(this.enpassant_sq)
        }
        if (this.check_if_square_takeable(atk1, piece.color) && !(this.check_if_sq_empty(atk1, piece))) {
            valid_moves.push(atk1)
        }
        if (this.check_if_square_takeable(atk2, piece.color) && !(this.check_if_sq_empty(atk2, piece))) {
            valid_moves.push(atk2)
        }
        return valid_moves
    }

    hypersquare_check(piece: Piece, current_sq: Square, mv: Vector, valid_moves: Array<Move>): Array<Move> {
        //const label: string = current_sq.label;
        if (current_sq instanceof Hyper  && !valid_moves.includes(current_sq)) { //!valid_moves.includes(current_sq)
            valid_moves.push(current_sq)
            for (let link_point of current_sq.link_sqs) {
                const lx: number = link_point.x;
                const ly: number = link_point.y;
                const link_sq = this.board[ly][lx] as Hyper;
                if (link_sq instanceof Hyper) {
                    mv = current_sq.invert(mv);
                    this.hyper_tracker = true;
                }
                else {
                    this.hyper_tracker = false;
                }
                console.log(mv, this.hyper_tracker)
                valid_moves = this.raycast(piece, link_sq, mv, valid_moves);
            }
        }
        return valid_moves;
    }

    raycast(piece: Piece, start_sq: Square, mv: Vector, valid_moves: Array<Move>): Array<Move> {
        let current_sq: Square = start_sq;
        let quit: boolean = false;
        while (quit == false) {
            //console.log(current_sq, mv)
            valid_moves = this.hypersquare_check(piece, current_sq, mv, valid_moves);

            if (this.check_if_sq_empty(current_sq, piece)) {
                valid_moves.push(current_sq); // This isn't working if we start raycasting on the current sq
            }
            else if (this.check_if_square_takeable(current_sq, piece.color)){
                valid_moves.push(current_sq);
                // Set quit to true here so we can't skip over opponent's pieces
                quit = true;
            }
            else {
                quit = true;
            }
            // Only update square if you've not hit a forbidden square - will we get out of range error at some point?
            if (quit == false) {
                const p = current_sq.point;
                current_sq = this.board[p.y + mv.y][p.x + mv.x];
            }
        }
        return valid_moves;
    }

    make_move(old_sq: Square, new_sq: Square) {
        const old_label: Label = old_sq.label
        const new_label: Label = new_sq.label
        const old_p: Point = old_sq.point
        const new_p: Point = new_sq.point
        const piece: Piece = this.LabelPiece.get(old_label) as Piece

        // NORMAL MOVE LOGIC
        if (this.LabelPiece.has(new_label)) {
            this.LabelPiece.delete(new_label)
        }
        this.LabelPiece.delete(old_label)
        this.LabelPiece.set(new_label, piece)
        
        // DOUBLE MOVE
        if ((piece instanceof Pawn) && ((old_p.y - new_p.y)**2 == 4)) {
            const enp_sq: Square = this.board[old_p.y + piece.direction][old_p.x]
            this.enpassant_sq = enp_sq
            piece.unmoved = false
        } // ENPASASNT
        else if ((piece instanceof Pawn) && (new_sq == this.enpassant_sq)){
            const enp_victim: Square = this.board[this.enpassant_sq.point.y - piece.direction][this.enpassant_sq.point.x]
            this.LabelPiece.delete(enp_victim.label)
            piece.unmoved = false
            this.global_update = true
            this.enpassant_sq = null
        } // BLACK PROMOTION
        else if ((piece instanceof Pawn) && (piece.color == "black") && (new_p.y == this.board.base_board_inds[1])) {
            const queen: Queen = new Queen(piece.color)
            this.LabelPiece.delete(new_label)
            this.LabelPiece.set(new_label, queen)
            this.global_update = true
            this.enpassant_sq = null
        } // WHITE PROMOTION
        else if ((piece instanceof Pawn) && (piece.color == "white") && (new_p.y == this.board.base_board_inds[3])) {
            const queen: Queen = new Queen(piece.color)
            this.LabelPiece.delete(new_label)
            this.LabelPiece.set(new_label, queen)
            this.global_update = true
            this.enpassant_sq = null
        } // CASTLING
        else if ((piece instanceof King) && ((old_p.x - new_p.x)**2 == 4)) {
            const dir: number = (old_p.x - new_p.x) / 2 
            const rook_castle_x: number = (old_p.x - new_p.x > 0) ? this.board.base_board_inds[0] : this.board.base_board_inds[2]
            const rook_castle_sq: Square = this.board[old_p.y][rook_castle_x]
            const rook: Piece = this.LabelPiece.get(rook_castle_sq.label) as Piece
            const new_rook_label: Label = this.board[old_p.y][old_p.x - dir].label
            this.LabelPiece.delete(rook)
            this.LabelPiece.set(new_rook_label, rook)
            this.global_update = true
        } // SET MOVED AND RESET EN PASSANT
        else if ((piece instanceof Pawn) || (piece instanceof King) || (piece instanceof Rook)) {
            piece.unmoved = false
            this.enpassant_sq = null
        }
        else {
            this.global_update = false
        }
    }

    public print_board() : void {
        //Print out string repr of the board so we know what's going on
        for (let iy=0; iy<this.board.length; iy++) {
            let out_row = [alphabet[iy]];
            let row = this.board[iy];
            for (let sq of row) {
                let out_char: string = "";
                 
                if (this.LabelPiece.has(sq.label)) {
                    const piece: Piece = this.LabelPiece.get(sq.label) as Piece;
                    out_char = piece.piece_char;
                }
                else if (sq instanceof Forbidden) {
                    out_char = " ";
                }
                else if (sq instanceof Link) {
                    out_char = "L";
                }
                else if (sq instanceof Arch) {
                    out_char = "A";
                }
                else if (sq instanceof Circle) {
                    out_char = "C";
                }
                else if (sq instanceof Hyper) {
                    out_char = "H";
                }
                else {
                    out_char = (sq.color == "black") ? "B" : "W";
                }
                out_row.push(out_char);
            }
            console.log(out_row.join(""));
        }
        console.log(" " + alphabet);
    }
}

export var g = new Game(8, 8, test_pair, rook_test);
