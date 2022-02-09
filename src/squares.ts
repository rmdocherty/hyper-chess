//========CONSTANTS========
export const WHOLE_BOARD_WIDTH: number = 16
export const WHOLE_BOARD_HEIGHT: number = 16
export const alphabet: string = "abcdefghijklmnop";

//========TYPES========
export type Point = {
    x: number;
    y: number;
}

//lazy but vectors are effectively just points - defined for clarity
export type Vector = Point


//========SQUARES========
export class Square {
    /* Square class:
    Represents a square on the gameboard: has an associated point, a color (derived from its postion
    as in normal chess) and a label (like in normal chess notation i.e a8) which will be used to index 
    the point map later (as you can't map via objects).
    */
    point: Point;
    color: string;
    label: string;
    constructor(point: Point){
        this.point = point;
        this.color = ((point.x + point.y) % 2 == 0) ? "black" : "white";
        if (point.x > WHOLE_BOARD_WIDTH || point.x < 0 || point.y > WHOLE_BOARD_HEIGHT || point.y < 0) {
            throw new RangeError("Must initialise square inside the allowed (16x16) range!");
        }
        
        const y_num_str: string = String(point.y);
        this.label = alphabet[point.x] + y_num_str;
    }
}

export class Forbidden extends Square {
    /* Forbidden:
    A square subclass that's not meant to do anything i.e just used for terminating raycasts.
    */
    constructor(point: Point){
        super(point);
    }
}


//========HYPERSQUARES========:
export class Hyper extends Square {
    /* Hyper:
    Links to another square on the board - link needs to be based on points rather than
    squares as the other hypersquares won't be initialised yet. Contains a vector that will
    invert (or not) an incoming move vector (to create the illusion of looping). Sits at
    the ends of a loop only.
    */
    link_sqs: Array<Point>;
    b_invert: Vector;
    r_invert: Vector;
    constructor(point: Point, link_sqs: Array<Point>){
        super(point);
        //List of squares the HS links to - should only be length 1
        this.link_sqs = link_sqs;
        if (link_sqs.length < 1) {
            throw new RangeError("All Hyper squares must link to at least one square!");
        }
        //Vectors that map the old move vector to the new one
        //(new_x, new_y) = (old_x * invert_x, old_y * invert_ y)
        this.b_invert = {"x": 1, "y":1};
        this.r_invert = {"x": 1, "y":1};
    }

    public invert(mv: Vector) : Vector{
        //When a continuous piece lands on a HS, remap its move vector for later
        let out_vec: Vector;
        if (mv.x == 0 || mv.y == 0) { //this implies we have a rook
            out_vec = {"x": mv.x * this.r_invert.x, "y": mv.y * this.r_invert.y};
        }
        else { //else mapping bishop style
            out_vec = {"x": mv.x * this.b_invert.x, "y": mv.y * this.b_invert.y};
        }
        //note this uses move vector logic, not piece logic so works for queens etc
        return out_vec;
    }
}

export class Link extends Hyper {
    /* Link:
    Bidirectional links to other Hyper and Link squares. These don't invert the movevector so
    can inherit the identity ones from Hyper. Never sit at the ends of loops, only in the middle.
     */
    constructor(point: Point, link_sqs: Array<Point>){
        super(point, link_sqs);
        if (link_sqs.length != 2) {
            throw new RangeError("Link must only link to 2 squares!");
        }
    }
}

export class Arch extends Hyper {
    /* Arches:
    Connect same sides of the board and map direction vectors appropriately. 
    */
    dir: Number
    constructor(point: Point, link_sqs: Array<Point>, align: String) {
        super(point, link_sqs);
        if (align == "x") {
            this.b_invert = {"x": -1, "y":1};
            this.r_invert = {"x": -1, "y":1};
        }
        else if (align == "y"){
            this.b_invert = {"x": 1, "y":-1};
            this.r_invert = {"x": 1, "y":-1};
        }
        else {
            throw new EvalError("Align must be string value of x or y");
        }
    }
}

export class Circle extends Hyper {
    dir: Number
    constructor(point: Point, link_sqs: Array<Point>, align: String) {
        super(point, link_sqs);
        this.b_invert = {"x": -1, "y":-1}; //same in both cases
        if (align == "t") {
            this.r_invert = {"x": -1, "y":1};
        }
        else if (align == "b"){
            this.r_invert = {"x": 1, "y":-1};
        }
        else {
            throw new EvalError("Align must be string value of x or y");
        }
    }

    public invert(mv: Vector) : Vector{
        //Overwrites old method
        let out_vec: Vector;
        if (mv.x == 0 || mv.y == 0) { //transpose the move vector i.e (0, n) -> (n, 0) with (or without) a sign change
            out_vec = {"x": mv.y * this.r_invert.x, "y": mv.x * this.r_invert.y};
        }
        else { //else mapping bishop style
            out_vec = {"x": mv.x * this.b_invert.x, "y": mv.y * this.b_invert.y};
        }
        return out_vec;
    }
}