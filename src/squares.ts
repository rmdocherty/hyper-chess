export var WHOLE_BOARD_WIDTH: number = 14
export var WHOLE_BOARD_HEIGHT: number = 18

export var NORM_BOARD_WIDTH: number = 8
export var NORM_BOARD_HEIGHT: number = 8

export class Point {
    x: number
    y: number
    index: number
    constructor(x, y){
        this.x = x
        this.y = y
        this.index = this.x + this.y * WHOLE_BOARD_WIDTH
    }

    calculate_index(){
        return this.x + this.y * WHOLE_BOARD_WIDTH
    }
}

export class Square {
    point: Point
    color: string
    // type: Square
    constructor(point: Point){
        this.point = point
        this.color = ((point.x + point.y) % 2 == 0) ? "black" : "white"
    }
}

export class Forbidden extends Square {
    constructor(point: Point){
        super(point)
    }
}

export class Hyper extends Square {
    link_sqs: Array<Point>
    invert: boolean
    constructor(point: Point, link_sqs: Array<Point>, invert: boolean = true){
        super(point)
        this.link_sqs = link_sqs
        this.invert = invert
    }
}



