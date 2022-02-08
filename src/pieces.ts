import {Square} from './squares'
import {Point} from './squares'

// export enum Pieces {
//     King = 1,
//     Queen,
//     Rook,
//     Knight,
//     Bishop,
//     Pawn
// }

export enum Color {
    White,
    Black,
}

export class MoveVector {
    x: number
    y: number
    constructor(x, y){
        this.x = x
        this.y = y
    }
}

export class Piece {
    // //type: Pieces;
    position: Point;
    move_vectors: Array<MoveVector>;
    move_continuous: boolean;
    color: Color
    piece_char: string
    sprite_str: string
    img: HTMLImageElement
    constructor(position: Point, color: Color){
        this.position = position
        this.color = color
        this.piece_char = "p" //redundant line?
        
    }

    make_img(){
        this.sprite_str = "assets/" + this.piece_char + ".png"
        this.img = new Image(0, 0)//document.createElement("img")
        this.img.id = this.piece_char
        this.img.src = this.sprite_str
        this.img.className = "hiddenImg"
        document.body.appendChild(this.img)
    }
}

export class King extends Piece {
    unmoved: boolean
    constructor(position: Point, color: Color){
        super(position, color)
        // //this.type = Pieces.King
        this.move_vectors = [
            new MoveVector(-1, -1),
            new MoveVector(-1, 0),
            new MoveVector(-1, 1),
            new MoveVector(0, -1),
            new MoveVector(0, 1),
            new MoveVector(1, -1),
            new MoveVector(1, 0),
            new MoveVector(1, 1),
        ]
        this.move_continuous = false
        this.unmoved = true
        this.piece_char = (this.color == Color.White) ? "K" : "k"
        this.make_img()
    }

}

export class Queen extends Piece {
    constructor(position: Point, color: Color){
        super(position, color)
        // //this.type = Pieces.Queen
        this.move_vectors = [
            new MoveVector(-1, -1),
            new MoveVector(-1, 0),
            new MoveVector(-1, 1),
            new MoveVector(0, -1),
            new MoveVector(0, 1),
            new MoveVector(1, -1),
            new MoveVector(1, 0),
            new MoveVector(1, 1),
        ]
        this.move_continuous = true
        this.piece_char = (this.color == Color.White) ? "Q" : "q"
        this.make_img()
    }
}

export class Rook extends Piece {
    unmoved: boolean
    constructor(position: Point, color: Color){
        super(position, color)
        // this.type = Pieces.Rook
        this.move_vectors = [
            new MoveVector(-1, 0),
            new MoveVector(0, -1),
            new MoveVector(0, 1),
            new MoveVector(1, 0),
        ]
        this.move_continuous = true
        this.unmoved = true
        this.piece_char = (this.color == Color.White) ? "R" : "r"
        this.make_img()
    }
}

export class Knight extends Piece {
    constructor(position: Point, color: Color){
        super(position, color)
        // //this.type = Pieces.Knight
        this.move_vectors = [
            new MoveVector(-1, -2),
            new MoveVector(-2, -1),
            new MoveVector(-2, 1),
            new MoveVector(-2, 1),
            new MoveVector(1, 2),
            new MoveVector(1, -2),
            new MoveVector(2, 1),
            new MoveVector(2, -1),
        ]
        this.move_continuous = false
        this.piece_char = (this.color == Color.White) ? "N" : "n"
        this.make_img()
    }
}

export class Bishop extends Piece {
    constructor(position: Point, color: Color){
        super(position, color)
        // //this.type = Pieces.Bishop
        this.move_vectors = [
            new MoveVector(-1, -1),
            new MoveVector(-1, 1),
            new MoveVector(1, -1),
            new MoveVector(1, 1),
        ]
        this.move_continuous = true
        this.piece_char = (this.color == Color.White) ? "B" : "b"
        this.make_img()
    }
}

export class Pawn extends Piece {
    unmoved: boolean;
    direction: number;
    attack_vectors: Array<MoveVector>
    constructor(position: Point, color: Color){
        super(position, color)
        // //this.type = Pieces.Pawn

        this.direction = (color == Color.Black) ? -1 : 1
        this.move_vectors = [
            new MoveVector(0, this.direction),
            new MoveVector(0, this.direction*2)
            // new MoveVector(1, this.direction),
            // new MoveVector(-1, this.direction)
        ]

        this.attack_vectors = [
            new MoveVector(1, this.direction),
            new MoveVector(-1, this.direction)
        ]


        this.move_continuous = false
        this.unmoved = true
        this.piece_char = (this.color == Color.White) ? "P" : "p"
        this.make_img()
    }
}
