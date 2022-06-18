import { Forbidden, Square, Label, Color, Point, Align } from './squares'
import { Board, Squares, EndChar, LoopType } from './board'
import { PieceChar, Piece } from './pieces'
import { string_to_piece, Game } from './game'
import * as geom from './geometry'
import { Visual_Board, Pixel, canvas, SQ_W, switch_colour } from './graphics'
import { peerjs } from './peerJS.js'

type AppType = "single" | "host" | "guest" | "build"
type BuildMode = "square" | "loop" | "pair" | "piece" | "delete"

const app_type = window.location.href.split('?')[1] as AppType

var peer = null
var conn = null

const words: string = "acdefghijklmnopqrstuvwyzABCEDFGHIJKLMNOPQRSTUVWYZ1234567890"

function get_JSON_localStorage(key: string): Object {
    const grabbed_obj = localStorage.getItem(key)
    if (grabbed_obj == null) {
        return null
    }
    else {
        return JSON.parse(grabbed_obj)
    }
}

function join(id: string): void{
    if (conn) {
        conn.close();
    }
    conn = peer.connect(id)
    conn.on('data', function(data) {
        if (app_type == "guest" && typeof data === 'object') {
            app.game_JSON = data
            app.load_from_game(app.load_game_from_JSON(data, app.game.player))
            app.vboard.reset_board()
            if (app.game.player == "white") {
                app.flip_board()
            }
            app.draw()
        }
        else if (typeof data === 'string' && data.length == 5) {
            const colour: Color = data as Color
            app.game.player = colour
        }
        else if (typeof data === 'string' && data.length == 4) {
            const old_label: string = data[0] + data[1]
            const new_label: string = data[2] + data[3]
            //console.log(old_label, new_label)
            app.game.make_move_by_label(old_label, new_label)
            app.vboard.draw_board()
            app.vboard.draw_pieces(app.game.LabelPiece)
            check_win(app.game)
        }
    });
    conn.on('open', function() {
        //console.log('Connected to ', conn.peer);
    });
}

function rand(l) { return Math.floor(Math.random()*l)}

class App {
    game: Game
    game_JSON: Object
    vboard: Visual_Board
    friend_id: string
    id: string
    place_stack: Array<Point>
    constructor(){
        this.initialise(app_type)
        this.place_stack = []
    }

    initialise(app_type: AppType){
        //console.log("Game is ", app_type, " type")
        this.id = this.gen_id()
        let game: Game
        if (app_type == "build") {
            localStorage.setItem("colour", "black")
        }
        if (app_type == "single" || app_type == "host" || app_type == "build") {
            game = this.load_game_from_local_storage()
            this.load_from_game(game)
        }
        else if (app_type == "guest") {
            const g = new Game(8, 8, "white", "", "")
            this.load_from_game(g)
        }
        if (app_type == "host" || app_type == "guest") {
            this.start_networking()
        }
    }

    gen_id(): string{
        const len: number = words.length - 1
        const base_id: Array<number> = [0,0,0,0,0,0]
        const id: string = base_id.map(p => words[rand(len)]).join('')
        //console.log(id)
        return id
    }

    load_game_from_JSON(JSON_data, colour_string: string) : Game{
        const h: number = (JSON_data['h'] != null) ? parseInt(JSON_data['h']) : 8
        const w: number = (JSON_data['w'] != null) ? parseInt(JSON_data['w']) : 8
        const board_str: string = (JSON_data['board_str'] != null) ? JSON_data['board_str'] : ""
        const FEN: string = (JSON_data['FEN'] != null) ? JSON_data['FEN'] : ""
        const player: string = (JSON_data['player'] != null) ? JSON_data['player'] : "white"
        const g = new Game(w, h, colour_string, board_str, FEN, player)
        return g
    }

    load_game_from_local_storage(): Game{
        let JSON_data: Object = require("./games.json")
        const user_games: Object = get_JSON_localStorage("user_games")
        if (user_games != null) {
            for (let [key, values] of Object.entries(user_games)) {
                JSON_data[key] = values
            }
        }
        const selected_game: string = localStorage.getItem("selected_game")
        let selected_JSON: string = JSON_data[selected_game]

        const current_game: Object = get_JSON_localStorage("current_game")//JSON.parse(localStorage.getItem("current_game"))        
        if ((current_game != null) && (current_game["board_str"] == selected_JSON["board_str"])) {
            this.game_JSON = current_game
        }
        else {
            this.game_JSON = selected_JSON
        }
        const colour_string: string = localStorage.getItem("colour")
        const g: Game = this.load_game_from_JSON(this.game_JSON, colour_string)
        return g
    }

    load_from_game(game: Game): void{
        this.game = game
        this.vboard = new Visual_Board(this.game)
        this.vboard.make_visual_board()
    }

    save_game_to_local_storage(): void {
        const FEN: string = this.game.get_fen_from_game()
        this.game_JSON["FEN"] = FEN
        this.game_JSON["player"] = this.game.current_turn
        localStorage.setItem("current_game", JSON.stringify(this.game_JSON))
    }

    save_board_to_local_storage(board_name: string) {
        let user_games: any = (localStorage.getItem("user_games") !== null) ? localStorage.getItem("user_games") : null
        const user_game: object = this.game.export_game()
        if (user_games != null) {
            user_games = JSON.parse(user_games)
            user_games[board_name]  = user_game
        }
        else {
            user_games = {}
            user_games[board_name] = user_game
        }
        console.log(JSON.stringify(user_game))
        console.log(user_games)
        console.log(JSON.stringify(user_games))
        localStorage.setItem("user_games", JSON.stringify(user_games))
    }

    download_game(): void {
        const user_game: object = this.game.export_game()
        const data: string = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user_game));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.href = "data:" + data;
        const game_name: string = localStorage.getItem("selected_game")
        downloadAnchorNode.setAttribute("download", game_name + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    draw() {
        if (app_type == "build") {
            this.vboard.draw_board("grid") //draw twice to draw over grid with board.
            this.vboard.draw_board("default")
        }
        else {
            this.vboard.draw_board()
        }
        
        this.vboard.draw_pieces(this.game.LabelPiece)
    }

    flip_board() {
        this.vboard.flip_board()
    }

    make_move_by_label(old_sq_label: string, new_sq_label: string): void{
        this.vboard.make_move_by_label(old_sq_label, new_sq_label)
        this.save_game_to_local_storage() //this doesn't work for client games - they don't have a game JSON!
    }

    start_networking(){
        peer = new peerjs.Peer(this.id)
        const url_split: Array<string> = window.location.href.split('?')
        const type: AppType = url_split[1] as AppType
        const player_col: Color = this.game.player
        const vboard = this.vboard
        const game = this.game
        peer.on('open', function(id) {
            if (type == "host"){
                const host_split: Array<string> = window.location.href.split('/')
                const url: string = host_split[0] + "//" + host_split[1] + host_split[2] //url_split[0]
                const modal = document.getElementById("inviteModal")
                const modal_text = document.getElementById("inviteText") as HTMLInputElement
                modal_text.value = url +'?' + id //url+"?guest?"+id
                modal.style.display = "block"
            }
            else if (type == "guest") {
                const friend_id: string = url_split[2]
                join(friend_id)
            }
        })
        peer.on('connection', function(dataConnection){
            if (type == "host") {
                conn = dataConnection //join(dataConnection.peer)
                const modal = document.getElementById("inviteModal")
                modal.style.display = "none"
                conn.on('data', function(data) {
                    const old_label: string = data[0] + data[1]
                    const new_label: string = data[2] + data[3]
                    //console.log(old_label, new_label)
                    game.make_move_by_label(old_label, new_label)
                    vboard.draw_board()
                    vboard.draw_pieces(game.LabelPiece)
                    check_win(game)
                });
                console.log('Connected to ', conn.peer);
                conn.on('open', function() {
                    // sending objects may not work on safari - could send string instead
                    const opponent_color: Color = (player_col == "white") ? "black" : "white"
                    conn.send(opponent_color)
                    const JSON_data: string = require("./games.json")
                    const selected_game: string = localStorage.getItem("selected_game")
                    let game_JSON = JSON_data[selected_game]
                    game_JSON["FEN"] = app.game.get_fen_from_game() //this is terrible but needed to 
                    conn.send(game_JSON) //JSON_data[selected_game]
                });
            }
        })
    }

    
    
    handle_click_game(x: Pixel, y: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
        //console.log("test")
        for (let row of vboard){
            for (let v_sq of row) {
                let min_p = v_sq.bbox[0]
                let max_p = v_sq.bbox[3]
                if ((x < max_p[0] && x > min_p[0]) && (y < max_p[1] && y > min_p[1]) && !(v_sq.real_sq instanceof Forbidden)) {
                    on_board = true
                    const is_move: boolean = vboard.current_vec.includes(v_sq.real_sq)
                    if (vboard.current_vec.length == 0){
                        vboard.current_vec.push(v_sq.real_sq)
                    }
                    const end_sq_label: Label = v_sq.real_sq.point.label
                    const is_occupied: boolean = g.LabelPiece.has(end_sq_label)
                    const piece: Piece = g.LabelPiece.get(end_sq_label) as Piece
                    
                    if (is_occupied && vboard.current_vec.length == 1) { //&& vboard.current_vec.length == 1
                        // PICKING A PIECE CASE
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = vboard.current_vec.concat(moves)
                    }
                    else if ((is_move) && (v_sq.real_sq != vboard.current_vec[0])) {
                        // TAKE A PIECE
                        const start_sq_label: string = vboard.current_vec[0].label
                        const start_piece: Piece = g.LabelPiece.get(start_sq_label) as Piece
                        if (start_piece.color == this.game.current_turn) {
                            if (app_type == "guest" || app_type == "host") {
                                if (g.player == start_piece.color) {
                                    this.make_move_by_label(start_sq_label, end_sq_label)
                                    conn.send(start_sq_label+end_sq_label)   
                                }
                            }
                            else {
                                this.make_move_by_label(start_sq_label, end_sq_label)
                            }
                        }
                        else {
                            vboard.reset_current_vec()
                        }       
                    }
                    else if (is_occupied){
                        vboard.reset_current_vec()
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = moves
                    }
                    else {
                        vboard.reset_current_vec()
                    }
                }
            }
        }
        let chosen_piece: Piece;
        if (vboard.current_vec.length > 0) {
            const current_label: Label = vboard.current_vec[0].label
            if (g.LabelPiece.has(current_label)) {
                chosen_piece = g.LabelPiece.get(current_label) as Piece
            }
        }
        
        if (g.global_update) { //problem here: after promotion queen img loads too slow to be displayed
            //vboard.draw_board()
            //vboard.draw_pieces(g.LabelPiece)
            this.draw()
            g.global_update = false
        }
        
        else if (chosen_piece != null && chosen_piece.color == this.game.current_turn){
            vboard.draw_vector(vboard.current_vec, "active")
        }
        else if (chosen_piece != null && !(chosen_piece.color == this.game.current_turn)){
            vboard.draw_vector(vboard.current_vec, "inactive")
        }
        else {
            vboard.draw_vector(vboard.current_vec, "active")
        }

        if (on_board == false) {
            vboard.reset_current_vec()
        }
        check_win(g)
        if ((x < 2*SQ_W) && (y < 2*SQ_W)) {
            openNav()
        }
    }

    map_build_mode_function(sx: number, sy: number, mode: BuildMode): void {
        const elem: HTMLInputElement = document.getElementById("build_mode_select") as HTMLInputElement
        const build_mode: BuildMode = elem.value as BuildMode
        switch (build_mode) {
            case "square":
                this.place_stack = []
                this.place_single_square(sx, sy, Square)
                this.draw()
                break;
            case "loop":
                this.place_loop(sx, sy, "loop")
                break;
            case "pair":
                this.place_loop(sx, sy, "pair")
                break;
            case "piece":
                this.place_stack = []
                this.place_piece(sx, sy)
                this.draw()
                break;
            case "delete":
                this.place_stack = []
                this.delete(sx, sy)
                this.draw()
                break;  
        } 
    }

    add_loop_str_to_board(loop_str: string): void {
        let current_board_loop_str: string = this.game.board.board_str
        console.log("adding", loop_str)
        if (current_board_loop_str == "") {
            current_board_loop_str += (loop_str)
        }
        else {
            console.log("adding to existing")
            current_board_loop_str += ("%" + loop_str)
        }
        console.log(current_board_loop_str)
        this.game.board.board_str = current_board_loop_str
    }

    place_single_square(sx: number, sy: number, sq_type: any): void {
        const board: Board = this.game.board
        if (board[sy][sx] instanceof Forbidden) {
            const new_sq: Square = new sq_type(new Point(sx,sy))
            board[sy][sx] = new_sq
            this.vboard.add_square(sx, sy)
            this.add_loop_str_to_board("xn"+new_sq.label)
            //board.board_str += "xn"+new_sq.label + "%"
        }
        else {
            return
        }
        
    }

    delete(sx: number, sy: number): void {
        const old_sq: Square = this.game.board[sy][sx]
        const game: Game = this.game
        if (game.LabelPiece.has(old_sq.label)) {
            game.LabelPiece.delete(old_sq.label)
        }
        else {
            const new_sq: Square = new Forbidden(new Point(sx,sy))
            game.board[sy][sx] = new_sq
            this.vboard[sy][sx] = this.vboard.background_obj(sx, sy)
            this.add_loop_str_to_board("xf"+new_sq.label)//game.board.board_str += "xf"+new_sq.label +"%"
        }
    }

    place_piece(sx: number, sy: number): void {
        const old_sq: Square = this.game.board[sy][sx]
        const game: Game = this.game
        if (game.LabelPiece.has(old_sq.label)) {
            return
        }
        else if (old_sq instanceof Forbidden){
            return
        }
        else {
            const piece_char: PieceChar = (document.getElementById("piece_type_select") as HTMLInputElement).value as PieceChar
            const color: Color = (document.getElementById("piece_col_select") as HTMLInputElement).value as Color
            game.add_piece(piece_char, color, sx, sy)
        }
    }

    place_loop(sx: number, sy: number, mode: string) {
        if (this.place_stack.length == 0) {
            this.place_stack.push(new Point(sx, sy))
            this.vboard[sy][sx].fill("black_inactive")
        }
        else {
            try { 
                const p0: Point = this.place_stack[0]
                this.vboard[p0.y][p0.x].fill("bg")
                this.place_stack.push(new Point(sx, sy))
                this.add_loop(mode)
                this.place_stack = []
                this.draw()
            }
            catch {
                this.place_stack = []
                this.draw()
            }
        }
    }

    put_points_in_normal_order(points: Array<Point>){
        const p0: Point = points[0]
        const p1: Point = points[1]
        if (p1.x < p0.x && p1.y < p0.y) {
            return [p1, p0]
        }
        else if (p1.x == p0.x && p1.y < p0.y) {
            return [p1, p0]
        }
        else if (p1.x < p0.x && p1.y == p0.y) {
            return [p1, p0]
        }
        else {
            return points
        }
    }

    get_loop_str_from_placed(mode:string): string{
        const points: Array<Point> = this.put_points_in_normal_order(this.place_stack)
        let end_char: string = (document.getElementById("loop_type_select") as HTMLInputElement).value as EndChar
        const loop_type: LoopType = (document.getElementById("build_mode_select") as HTMLInputElement).value as LoopType
        end_char = ((end_char == "l") && (loop_type == "pair")) ? "h" : end_char
        end_char = (loop_type == "loop") ? end_char.toUpperCase() :  end_char.toLowerCase()
        const align: Align = geom.map_points_to_align(points, this.game.board.base_board_inds)
        const sq_1_label: Label = this.place_stack[0].label
        const sq_2_label: Label = this.place_stack[1].label
        return align + end_char + sq_1_label + sq_2_label
    }

    add_loop(mode: string) {
        const loop_str: string = this.get_loop_str_from_placed(mode)
        console.log(loop_str)
        this.game.board.make_loop(loop_str)
        //this.game.board.board_str += loop_str + "%"
        this.add_loop_str_to_board(loop_str)
        this.vboard.add_loops()
    }

    handle_click_build(cx: Pixel, cy: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
        //console.log("test")
        console.log(cx, cy)
        for (let row of vboard){
            for (let v_sq of row) {
                let min_p = v_sq.bbox[0]
                let max_p = v_sq.bbox[3]
                if ((cx < max_p[0] && cx > min_p[0]) && (cy < max_p[1] && cy > min_p[1])) {
                    const x: number = v_sq.real_sq.x
                    const y: number = v_sq.real_sq.y
                    console.log(x, y)
                    const build_mode: BuildMode = (document.getElementById("build_mode_select") as HTMLInputElement).value as BuildMode
                    console.log(build_mode)
                    this.map_build_mode_function(x, y, build_mode)
                    //this.draw()
                }
            }
        }
        if ((cx < 2*SQ_W) && (cy < 2*SQ_W)) {
            openNav()
        }
    }
}

function check_win(g: Game) {
    if (g.winner != false) { //put this into an app based make_move function s.t it happens on host and guest.
        const win_text: HTMLElement = document.getElementById("winText")
        const winner: string = (g.winner == "black") ? "Black" : "White"
        win_text.innerHTML = winner
        const win_modal: HTMLElement = document.getElementById("winModal")
        win_modal.style.display = "block"
        localStorage.removeItem("current_game")
    }
}


function openNav() {
    document.getElementById("mySidenav").style.width = "275px";
}

document.getElementById("closebtn").onclick = function() {
    document.getElementById("mySidenav").style.width = "0px";
}

document.getElementById("downloadbtn").onclick = function() {
    app.download_game()
}

document.getElementById("savebtn").onclick = function() {
    let name = prompt("Name to save board as?")
    app.save_board_to_local_storage(name)
}

document.getElementById("palette_select").onchange = function() {
    const name: string = (document.getElementById("palette_select") as HTMLInputElement).value
    switch_colour(name)
    app.draw()
}


const build_mode: HTMLInputElement = document.getElementById("build_mode_select") as HTMLInputElement
build_mode.onchange = function(){
    const loop_select = document.getElementById("loop_type_div")
    const piece_type = document.getElementById("piece_type_div")
    const piece_col = document.getElementById("piece_col_div")
    if (build_mode.value == "square" || build_mode.value == "delete") {
        loop_select.style.display = "none"
        piece_type.style.display = "none"
        piece_col.style.display = "none"
    }
    else if (build_mode.value == "pair" || build_mode.value == "loop") {
        loop_select.style.display = "block"
        piece_type.style.display = "none"
        piece_col.style.display = "none"
    }
    else {
        loop_select.style.display = "none"
        piece_type.style.display = "block"
        piece_col.style.display = "block"
    }
}

const builder_dropdowns = document.getElementsByClassName("builder")
for (let i=0; i<builder_dropdowns.length; i++) {
    const elem: HTMLElement = builder_dropdowns[i] as HTMLElement
    if (app_type != "build") {
        elem.style.display = "none"
    }
}



let app: App = new App()

window.onload = function() {
    if (app.game.player == "white") {
        app.flip_board()
    }
    app.draw()
}

canvas.addEventListener('mousedown', e => {
    document.getElementById("mySidenav").style.width = "0px";
    const rect = canvas.getBoundingClientRect()
    const x: Pixel = e.clientX - rect.left
    const y: Pixel = e.clientY - rect.top

    if (app_type == "build") {
        app.handle_click_build(x, y)
    }
    else {
        app.handle_click_game(x, y)
    }
    
})
