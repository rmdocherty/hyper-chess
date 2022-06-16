import { alphabet, Line, WHOLE_BOARD_HEIGHT, WHOLE_BOARD_WIDTH } from "./squares";
import { label_to_point, x_y_to_label, dot } from "./squares";
import { Point, Color, Vector, Label } from "./squares";
import { Square, Forbidden, Hyper, Link, Arch, Circle } from "./squares";
import { Board } from "./board";
import { Piece, Pawn, Rook, Bishop, Knight, Queen, King } from "./pieces";

/*Compilation:
    npm run build
    node chess-bundle.js (not currently working as Image() in pieces.ts not working for node - is working when live tho?)
    npx webpack serve
*/

// FEN
const base_game_FEN: string = "FEN:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

export const string_to_piece = {"r": Rook, "n": Knight, "q": Queen, "p": Pawn, "k": King, "b": Bishop};

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
    global_update: boolean;
    player: Color;
    current_turn: Color
    winner: Color | boolean;
    constructor(bw: number, bh: number, colour_string: string, 
                loop_str: string = "", fen_str: string = "", start_player: string ="white") {
        this.board = new Board(bw, bh, loop_str);
        this.LabelPiece = new LabelPieceMap();
        this.enpassant_flag = false;
        this.turn_counter = 0;
        this.game_state = 0;
        this.hyper_tracker = true;
        this.global_update = false;
        this.player = this.get_colour(colour_string)
        this.current_turn = start_player as Color
        this.winner = false;
        this.gen_from_fen(fen_str);
    }

    get_colour(colour_string: string): Color {
        let colour: Color;
        if (colour_string == "black" || colour_string == "white") {
            colour = colour_string
        }
        else {
            const random_index: number = Math.floor(Math.random()*2)
            const colours: Array<Color> = ["white", "black"]
            colour = colours[random_index]
        }
        return colour
    }

    piece_to_square(piece: Piece): Square {
        const label: Label = this.LabelPiece.get(piece) as Label;
        const point: Point = label_to_point(label);
        const sq: Square = this.board[point.y][point.x];
        return sq
    }

    gen_from_fen(fen_str: string) {
        let fen: string;
        let type: string;
        if (fen_str == "") {
            [type, fen] = base_game_FEN.split(':');
        }
        else {
            [type, fen] = fen_str.split(':');
        }

        if (type == "FEN") {
            this.gen_from_normal_fen(fen);
        }
        else if (type == "HFEN") {
            this.gen_from_hfen(fen);
        }
        else {
            throw new Error("FEN string format invalid, must have 1 of FEN: or HFEN: identifier!");
        }
    }

    gen_from_normal_fen(fen_str: string) {
        let x: number = this.board.base_board_inds[0];
        let y: number = this.board.base_board_inds[3];
        this.gen_from_generic_fen(fen_str, x, y);
    }

    gen_from_hfen(hyper_fen_str: string) {
        let x: number = 0;
        let y: number = WHOLE_BOARD_HEIGHT - 1;
        this.gen_from_generic_fen(hyper_fen_str, x, y);
    }

    add_piece(piece_char: string, color: Color, x: number, y: number){
        const piece_type = string_to_piece[piece_char];
        const piece: Piece = new piece_type(color);
        const label: string = x_y_to_label(x, y);
        this.LabelPiece.set(label, piece);
    }

    gen_from_generic_fen(fen_str: string, x0: number, y0: number): void {
        let x: number = x0;
        let y: number = y0;
        for (let piece_str of fen_str) {
            let lower_case_str: string = piece_str.toLowerCase();
            let color: Color = "white";
            if (lower_case_str == piece_str){
                color  = "black";
            }
    
            if (piece_str == "/") {
                y -= 1;
                x = x0;
            }
            else if (['r', 'p', 'q', 'b', 'k', 'n'].includes(lower_case_str)) {
                this.add_piece(lower_case_str, color, x, y)
                x += 1
            }
            else {
                x += parseInt(piece_str);
            }
        }
    }

    get_fen_from_game(): string {
        let fen: string = "HFEN:";
        for (let iy=WHOLE_BOARD_HEIGHT-1; iy>-1; iy--) {
            let num: number = 0;
            for (let ix=0; ix<WHOLE_BOARD_WIDTH; ix++) {
                const p: Point = this.board[iy][ix].point;
                const label: string = p.label;
                if (this.LabelPiece.has(label)) {
                    const piece: Piece = this.LabelPiece.get(label) as Piece;
                    let piece_char: string = piece.piece_char;
                    if (piece.color == "white") {
                        piece_char = piece_char.toUpperCase();
                    }
                    const num_str: string = (num > 0) ? num.toString() : "";
                    fen = fen + num_str + piece_char;
                    num = 0;
                }
                else {
                    num += 1;
                }
            }
            const num_str: string = (num > 0) ? num.toString() : "";
            fen = fen + num_str + '/';
        }
        return fen;
    }

    export_game(): Object{
        const board: Board = this.board
        let board_str: string = board["board_str"]
        board_str = (board_str[board_str.length-1] == "%") ? board_str.slice(0, -1) : board_str
        return {"w": String(board.base_w), "h": String(board.base_h), "board_str": board_str, "FEN": this.get_fen_from_game()}
    }

    check_if_sq_empty(chk_sq: Square, piece: Piece): boolean{
        // Check if square occupied by anything
        let label: string;
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        try { // really lazy: this is in case we go out of bounds
            label = chk_sq.label;
        }
        catch (TypeError) {
            return false;
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
        let label:string;
        if (chk_sq instanceof Forbidden) {
            return false;
        }
        try {
            label = chk_sq.label;
        }
        catch (TypeError) {
            return false;
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

    takeable(chk_sq: Square, piece: Piece): boolean{
        return (this.check_if_square_takeable(chk_sq, piece.color) && !(this.check_if_sq_empty(chk_sq, piece)));
    }

    public find_valid_moves(piece: Piece): Array<Move> {
        let valid_moves: Array<Square> = [];

        if (piece instanceof Pawn) {
            valid_moves = this.find_valid_pawn_moves(piece);
            return valid_moves;
        }
        else if ((piece instanceof King) && (piece.unmoved == true)) {
            const castle_moves: Array<Square> = this.check_castling(piece);
            valid_moves = valid_moves.concat(castle_moves);
        }

        for (let mv of piece.move_vectors) { //BUG: if we start on a hypersquare, the link sq is added for the first move vector and no others, so piece appears stuck!
            const current_sq_label: Label = this.LabelPiece.get(piece) as Label;
            const current_point: Point = label_to_point(current_sq_label);
            const current_sq: Square = this.board.get_sq(current_point);
            if (piece.move_continuous == true) {
                const current_mv_moves: Array<Square> = this.raycast(piece, current_sq, mv, []);
                valid_moves = valid_moves.concat(current_mv_moves);
            }
            else {
                const new_point: Point = current_point.add(mv);
                const new_sq: Square = this.board.get_sq(new_point);
                if (this.check_if_square_takeable(new_sq, piece.color)) {
                    valid_moves.push(new_sq);
                }
            }
        }
        
        return valid_moves;
    }

    check_castling(piece: King) {
        let valid_moves: Array<Square> = []
        const start_sq: Square = this.piece_to_square(piece)
        const mvs: Array<Vector> = [new Point(-1, 0), new Point(1, 0)]
        for (let m of mvs) {
            const sqs: Array<Square> = this.raycast(piece, start_sq, m, [])
            const last_sq: Square = sqs[sqs.length-1]
            
            const next_sq: Square = this.board[last_sq.y][last_sq.x + m.x]
            const next_piece: any = this.LabelPiece.get(next_sq.label)
            if ((next_piece instanceof Rook) && (next_piece.color == piece.color) && (next_piece.unmoved == true)) {
                const king_move_sq: Square = this.board[start_sq.y][start_sq.x + 2*m.x]
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
        const s1: Square = this.board[p.y + mv.y][p.x]
        const s2: Square = this.board[p.y + 2*mv.y][p.x]
        const atk1: Square = this.board[p.y + av1.y][p.x + av1.x]
        const atk2: Square = this.board[p.y + av2.y][p.x + av2.x]
        // Moves
        if (this.check_if_sq_empty(s1, piece)){
            valid_moves.push(s1)
        } // double move
        if (piece.unmoved && this.check_if_sq_empty(s1, piece) && this.check_if_sq_empty(s2, piece)) {
            valid_moves.push(s2)
        }
        //enpassant
        if (atk1 == this.enpassant_sq && this.check_if_square_takeable(atk1, piece.color) && (this.check_if_sq_empty(atk1, piece))) { //this.check_if_square_takeable(atk1, piece.color) && !(this.check_if_sq_empty(atk1, piece))
            valid_moves.push(this.enpassant_sq)
        }
        if (atk2 == this.enpassant_sq && this.check_if_square_takeable(atk2, piece.color) && (this.check_if_sq_empty(atk2, piece))) { //this.check_if_square_takeable(atk2, piece.color) && !(this.check_if_sq_empty(atk2, piece))
            valid_moves.push(this.enpassant_sq)
        }
        // first attack
        if (this.check_if_square_takeable(atk1, piece.color) && !(this.check_if_sq_empty(atk1, piece))) {
            valid_moves.push(atk1)
        } // second attack
        if (this.check_if_square_takeable(atk2, piece.color) && !(this.check_if_sq_empty(atk2, piece))) {
            valid_moves.push(atk2)
        }
        return valid_moves
    }

    hypersquare_check(piece: Piece, current_sq: Square, mv: Vector, valid_moves: Array<Move>): Array<Move> {
        if (current_sq instanceof Hyper  && !valid_moves.includes(current_sq) && this.check_if_sq_empty(current_sq, piece)) { //problem here: if piece on hypersquare then can move through it
            valid_moves.push(current_sq)
            for (let link_point of current_sq.link_sqs) {
                const lx: number = link_point.x;
                const ly: number = link_point.y;
                const link_sq = this.board[ly][lx] as Hyper;
                if ((link_sq instanceof Line)) { //stops double column effect
                    const delta: Point = new Point(link_sq.x - current_sq.x, link_sq.y - current_sq. y)
                    if (dot(delta, mv) == 0) {
                        return valid_moves
                    }
                }
                
                if (!(link_sq instanceof Link) && !(valid_moves.includes(link_sq))) {
                    mv = link_sq.invert(mv);
                    valid_moves = this.raycast(piece, link_sq, mv, valid_moves);
                }
                else if (!valid_moves.includes(link_sq)) {
                    valid_moves = this.raycast(piece, link_sq, mv, valid_moves);
                }
            }
        }
        return valid_moves;
    }

    raycast(piece: Piece, start_sq: Square, mv: Vector, valid_moves: Array<Move>): Array<Move> {
        // Can I use a web worker for this bit? Might speed stuff up?
        let current_sq: Square = start_sq;
        let quit: boolean = false;
        while (quit == false) {
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
                try {
                    current_sq = this.board[p.y + mv.y][p.x + mv.x];
                }
                catch (TypeError) {
                    quit = true
                }
                
            }
        }
        return valid_moves;
    }

    make_move_by_label(old_sq_label: string, new_sq_label: string) {
        const old_p: Point = label_to_point(old_sq_label)
        const new_p: Point = label_to_point(new_sq_label)
        const old_sq: Square = this.board[old_p.y][old_p.x]
        const new_sq: Square = this.board[new_p.y][new_p.x]
        this.make_move(old_sq, new_sq)
    }

    make_move(old_sq: Square, new_sq: Square) {
        const old_label: Label = old_sq.label
        const new_label: Label = new_sq.label
        const old_p: Point = old_sq.point
        const new_p: Point = new_sq.point
        const taken_piece: Piece = this.LabelPiece.get(new_label) as Piece
        const piece: Piece = this.LabelPiece.get(old_label) as Piece

        // NORMAL MOVE LOGIC
        if (this.LabelPiece.has(new_label)) {
            this.LabelPiece.delete(new_label)
        }
        this.LabelPiece.delete(old_label)
        this.LabelPiece.set(new_label, piece)

        if (taken_piece instanceof King) {
            this.winner = piece.color
        }

        // Can clean up this next bit by only setting global_update and en_passant square when false or not null respectively
        
        // DOUBLE MOVE
        if ((piece instanceof Pawn) && ((old_p.y - new_p.y)**2 == 4)) {
            const enp_sq: Square = this.board[old_p.y + piece.direction][old_p.x]
            console.log(enp_sq)
            this.enpassant_sq = enp_sq
            piece.unmoved = false
        } // ENPASASNT
        else if ((piece instanceof Pawn) && (new_sq == this.enpassant_sq)){
            const enp_victim: Square = this.board[this.enpassant_sq.y - piece.direction][this.enpassant_sq.x]
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
        this.current_turn = (this.current_turn == "white") ? "black" : "white"
    }
}
