import * as brd from './board'
import * as sq from './squares'
import * as pc from './pieces'
import * as gm from './game'


var classic = {"bg": "#ebe5c0", "black": "#cab175", "white": "#e9daB5", 
          "black_active": "#bf8558", "white_active": "#e69f6a", "active": "#84a360", 
          "menu": "#a52a2a"}

var colours = classic


var canvas = document.getElementById("gameBoard") as HTMLCanvasElement
console.log(canvas)
var canvas_w = window.innerWidth, canvas_h = window.innerHeight
var ctx = canvas.getContext("2d") 
canvas.height = canvas_h
canvas.width = canvas_w

var DEG_TO_RAD = Math.PI / 180
var SQ_W = 50 //in pixels

var whole_board_pixel_l = (sq.WHOLE_BOARD_WIDTH  + 5) * SQ_W
var whole_board_pixel_h = (sq.WHOLE_BOARD_HEIGHT + 2) * SQ_W
var x_offset_px = Math.floor((canvas_w - whole_board_pixel_l) / 2)
var y_offset_px = Math.floor((canvas_h - whole_board_pixel_h) / 2)

var turn = 0

class Visual_Square {
    real_sq: sq.Square
    points: Array<number>
    type: string
    bbox: Array<Array<number>>
    constructor(real_square, points, type) {
        this.real_sq = real_square
        this.points = points
        this.type = type //or curved
        let x = points.map(p => p[0])
        let y = points.map(p => p[1])
        if (points.length > 2) {
            this.bbox = [[Math.min(...x), Math.min(...y)], [Math.min(...x), Math.max(...y)], [Math.max(...x), Math.min(...y)], [Math.max(...x), Math.max(...y)]]
        }
        else {
            this.bbox = [[0,0], [0,0], [0,0], [0,0]]
        }
        
    }

    draw(mode="default") {
        //console.log(this.points)
        let fill_colour = colours[this.real_sq.color]    
        if (mode == "active"){
            fill_colour = colours[this.real_sq.color + "_active"]
        }
        ctx.fillStyle = fill_colour
        let p1 = this.points[0]
        
        ctx.beginPath()
        ctx.moveTo(p1[0], p1[1])
        for (let p of this.points) {
            ctx.lineTo(p[0], p[1])
        }
        ctx.closePath()
        ctx.fill()
    }

    calc_centre_pads(obj_w, obj_h) {
        let x_diff = this.bbox[3][0] - this.bbox[0][0], y_diff = this.bbox[3][1] - this.bbox[0][1]
        let x_pad = (x_diff - obj_w) / 2, y_pad = (y_diff - obj_h) / 2

        let out = [x_pad, y_pad]
        return out
    }

    draw_sprite(sprite_addr) {
        let pads = this.calc_centre_pads(SQ_W, SQ_W)
        let real_x = pads[0] + this.bbox[0][0], real_y = pads[1] + this.bbox[0][1]
        //let spr = document.getElementById(sprite_addr) as HTMLImageElement
        //console.log(real_x, real_y)
        ctx.drawImage(sprite_addr, 0, 0, 60, 60, real_x, real_y, SQ_W, SQ_W)
    }

    draw_circle() {
        let pads = this.calc_centre_pads(SQ_W, SQ_W)
        let real_x = pads[0] + x_offset_px + SQ_W / 2, real_y = pads[1] + y_offset_px + SQ_W / 2
        ctx.beginPath();
        ctx.arc(real_x, real_y, SQ_W / 3, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

class Visual_Square_Forbidden extends Visual_Square {
    constructor(real_square, points, type) {
        super(real_square, points, type)
    }

    draw(mode = "default"){
        return 0
    }
}



function fill_canvas_bg(game){
    let squares = []
    for (let iy=0; iy<sq.WHOLE_BOARD_HEIGHT; iy++) {
        let row = []
        for (let ix=0; ix<sq.WHOLE_BOARD_WIDTH; ix++){
            let sq = new Visual_Square_Forbidden(game.board[iy][ix], [0, 0], "none")
            row.push(sq)
        }
        squares.push(row)
    }
    return squares
}

function fill_canvas_norm(game, graphics_board) {
    for (let iy=5; iy<5+sq.NORM_BOARD_HEIGHT; iy++) {
        for (let ix=3; ix<3+sq.NORM_BOARD_WIDTH; ix++){
            let blx = x_offset_px + ix * SQ_W
            let bly = y_offset_px + iy * SQ_W 
            let points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
            graphics_board[iy][ix] = new Visual_Square(game.board[iy][ix], points, "square")
        }
    }
    return graphics_board
}


function draw_board(graphics_board) {
    for (let row of graphics_board) {
        for (let g_sq of row) {
            if (g_sq.type == "curved"){
                console.log("drawing curve")
            }
            g_sq.draw("default")
        }
    }
}

function draw_vector(vector, graphics_board, mode) {
    for (let sq of vector) {
        let x = sq.point.x, y= sq.point.y
        let gfx_sq = graphics_board[y][x]
        gfx_sq.draw(mode)
    }
}

function draw_pieces(graphics_board, PointToPiece){
    console.log(PointToPiece)
    for (let [points, piece] of PointToPiece) {
        let point = piece.position
        let v_sq = graphics_board[point.y][point.x]
        //console.log(piece, v_sq)
        v_sq.draw_sprite(piece.img)
    }
}

var currently_highlighted = []

var new_game = new gm.Game(brd.board)
new_game.gen_from_fen(gm.base_game)

var visual_board = []



window.onload = function() {
    visual_board = fill_canvas_bg(new_game)
    visual_board = fill_canvas_norm(new_game, visual_board)
    //draw_board(visual_board)
    for (let l of brd.loops){
        console.log(l)
        visual_board = get_loop_coords(l, visual_board, new_game)
    }   
    console.log(visual_board)
    draw_board(visual_board)
    draw_pieces(visual_board, new_game.PointToPiece)

}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    console.log("x: " + x + " y: " + y)
    check_click(x, y, visual_board, turn)
})

function show_settings(){

}

function check_click(x, y, visual_board, turn){
    if (x < 60 && y < 60) {
        show_settings()
    }
    else {
        for (let row of visual_board){
            for (let v_sq of row) {
                let min_p = v_sq.bbox[0]
                let max_p = v_sq.bbox[3]
                
                if ((x < max_p[0] && x > min_p[0]) && (y < max_p[1] && y > min_p[1])) {
                    console.log("this square clicked", v_sq)
                    if (currently_highlighted.length == 0){
                        currently_highlighted.push(v_sq.real_sq)
                    }
                    
                    let list_of_sq = []
                    console.log(v_sq.real_sq.point.index)
                    if (new_game.PointToPiece.has(v_sq.real_sq.point.index) && (currently_highlighted.length == 1)){
                        console.log("checking for valid")
                        let piece = new_game.PointToPiece.get(v_sq.real_sq.point.index)
                        list_of_sq = new_game.find_valid_moves(piece)
                        currently_highlighted = currently_highlighted.concat(list_of_sq)
                        console.log(list_of_sq)
                        //draw_vector(currently_highlighted, visual_board, "active")
                        //draw_pieces(visual_board, new_game.PointToPiece)
                    }
                    else if (currently_highlighted.includes(v_sq.real_sq)) {
                        console.log("make move", currently_highlighted[0], v_sq.real_sq)
                        if (v_sq.real_sq != currently_highlighted[0]){
                            new_game.make_move(currently_highlighted[0], v_sq.real_sq)
                            currently_highlighted = []
                            draw_vector(currently_highlighted, visual_board, "default")
                        }
                        
                    }
                    else {
                        draw_vector(currently_highlighted, visual_board, "default")
                        currently_highlighted = []
                    }
                    draw_board(visual_board)
                    
                    draw_pieces(visual_board, new_game.PointToPiece)
                    draw_vector(currently_highlighted, visual_board, "active")
                    draw_pieces(visual_board, new_game.PointToPiece)
                    
                }
            }
        }
    }
}

function get_angles(loop: Array<sq.Square>) : Array<Array<number>> {
    let angle: number = 180 / loop.length
    let total_angles = 100

    let all_angles : Array<Array<number>> = []

    for (let i = 0; i < loop.length; i++) {
        let angles: Array<number> = []
        for(let j = 0; j < total_angles; j++){
            angles.push(i * angle + j / total_angles)
        }         all_angles.push(angles)

   }
    return all_angles
}

function get_coords(angles: Array<number>, r1: number, r2: number) : Array<sq.Point> {
    let r1_points: Array<sq.Point> = []
    let r2_points: Array<sq.Point> = []

    for(let angle of angles){
        // for (let subangle of angle) {
            let rad: number = angle * Math.PI / 180
            let x1: number = r1 * Math.cos(rad) + x_offset_px + 200
            let y1: number = r1 * Math.sin(rad) + y_offset_px + 200
            let x2: number = r2 * Math.cos(rad) + x_offset_px + 200
            let y2: number = r2 * Math.sin(rad) + y_offset_px + 200
            console.log(rad)
            r1_points.push(new sq.Point(x1, y1))
            r2_points.push(new sq.Point(x2, y2))
        // }
    }
    
    r2_points = r2_points.reverse()
    return r1_points.concat(r2_points)
}

function get_loop_coords(loop: Array<sq.Square>, graphics_board, game): Array<Visual_Square>{
    let r2 = Math.floor(loop.length / 2)  
    let r1 = r2 - 1
    let angles = get_angles(loop)

    for(let i=0; i<angles.length; i++){
        let angle = angles[i]
        let current_sq = loop[i]
        let point = current_sq.point
        //console.log(point.x, point.y)
        let coords = get_coords(angle, r1, r2)
        //console.log(coords)
        let blx = x_offset_px + point.x * SQ_W
            let bly = y_offset_px + point.y * SQ_W 
            let points = [[blx, bly], [blx + SQ_W, bly], [blx + SQ_W, bly + SQ_W], [blx, bly + SQ_W]]
        graphics_board[point.y][point.x] = new Visual_Square(game.board[point.y][point.x], points, "curved")
    // graphics_board[iy][ix] = new Visual_Square(game.board[iy][ix], points, "square")
    }    
    return graphics_board
}
