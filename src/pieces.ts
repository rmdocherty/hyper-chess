import {Color, Vector} from './squares'

const rook_like: Array<Vector> = [
    {"x": 1, "y":0}, 
    {"x": -1, "y":0}, 
    {"x": 0, "y":1}, 
    {"x": 0, "y":-1}
]
const bishop_like: Array<Vector> = [
    {"x": 1, "y":1}, 
    {"x": -1, "y":1}, 
    {"x": 1, "y":-1}, 
    {"x": -1, "y":-1}
]

export class Piece {
    move_vectors: Array<Vector>;
    move_continuous: boolean;
    color: Color;
    piece_char: string;
    sprite_str: string;
    img: HTMLImageElement;
    constructor(color: Color){
        this.color = color;
        this.piece_char = "p";
    }

    make_img(){
        this.sprite_str = "assets/" + this.piece_char + ".png";
        this.img = new Image(0, 0);
        this.img.id = this.piece_char;
        this.img.src = this.sprite_str;
        this.img.className = "hiddenImg";
        document.body.appendChild(this.img);
    }
}

export class King extends Piece {
    unmoved: boolean;
    constructor(color: Color){
        super(color);
        this.move_vectors = rook_like.concat(bishop_like);
        this.move_continuous = false;
        this.unmoved = true;
        this.piece_char = (this.color == "white") ? "K" : "k";
        this.make_img();
    }

}

export class Queen extends Piece {
    constructor(color: Color){
        super(color);
        this.move_vectors = rook_like.concat(bishop_like);
        this.move_continuous = true;
        this.piece_char = (this.color == "white") ? "Q" : "q";
        this.make_img();
    }
}

export class Rook extends Piece {
    unmoved: boolean;
    constructor(color: Color){
        super(color);
        this.move_vectors = rook_like;
        this.move_continuous = true;
        this.unmoved = true;
        this.piece_char = (this.color == "white") ? "R" : "r";
        this.make_img();
    }
}

export class Knight extends Piece {
    constructor(color: Color){
        super(color);
        this.move_vectors = [
            {"x": -1, "y": -2},
            {"x": -2, "y": -1},
            {"x": -2, "y": 1},
            {"x": -1, "y": 2},
            {"x": 1, "y": 2},
            {"x": 2, "y": 1},
            {"x": 1, "y": -2},
            {"x": 2, "y": -1},
        ];
        this.move_continuous = false;
        this.piece_char = (this.color == "white") ? "N" : "n";
        this.make_img();
    }
}

export class Bishop extends Piece {
    constructor(color: Color){
        super(color);
        this.move_vectors = bishop_like;
        this.move_continuous = true;
        this.piece_char = (this.color == "white") ? "B" : "b";
        this.make_img();
    }
}

export class Pawn extends Piece {
    unmoved: boolean;
    direction: number;
    attack_vectors: Array<Vector>
    constructor(color: Color){
        super(color);
        this.direction = (color == "white") ? -1 : 1;
        this.move_vectors = [{"x": 0, "y": this.direction}];
        this.attack_vectors = [
            {"x": 1, "y": this.direction}, 
            {"x": -1, "y": this.direction}
        ];
        this.move_continuous = false;
        this.unmoved = true;
        this.piece_char = (this.color == "white") ? "P" : "p";
        this.make_img();
    }
}
