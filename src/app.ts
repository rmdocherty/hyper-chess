import { Forbidden, Square, Label } from './squares'
import { Piece } from './pieces'
import { Game } from './game'
import { Visual_Board, Pixel, canvas} from './graphics'
import { peerjs } from './peerJS.js'

type AppType = "single" | "host" | "guest" | "build"

class App {
    game: Game
    vboard: Visual_Board
    app_type: AppType
    friend_id: string
    peer: peerjs.Peer
    constructor(){
        this.game = this.load_game_from_local_storage()
        this.vboard = new Visual_Board(this.game)
        this.vboard.make_visual_board()
        this.get_app_type()
    }

    draw() {
        this.vboard.draw_board()
        this.vboard.draw_pieces(this.game.LabelPiece)
    }

    load_game_from_local_storage(){
        const JSON_data: string = require("./games.json")
        const selected_game: string = localStorage.getItem("selected_game")
        const game = JSON_data[selected_game]
        const h: number = parseInt(game['h']), w: number = parseInt(game['w'])
        const board_str: string = game['board_str']
        const FEN: string = game['FEN']
        const g = new Game(w, h, board_str, FEN)
        return g
    }

    get_app_type(){
        const url: string = window.location.href
        const url_split: Array<string> = url.split('?')
        this.app_type = url_split[1] as AppType
        if (this.app_type == "guest") {
            this.friend_id = url_split[2]
        }
        else {
            this.friend_id = ""
        }
        this.start_networking()
    }

    start_networking(){
        this.peer = new peerjs.Peer()
        this.peer.on('open', function(id) {
            console.log(id)
        })
    }

    

    check_click(x: Pixel, y: Pixel): void{
        const vboard: Visual_Board = this.vboard
        const g: Game = vboard.game
        let on_board: boolean = false
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
                    const label: Label = v_sq.real_sq.point.label
                    const is_occupied: boolean = g.LabelPiece.has(label)
                    
                    if (is_occupied && vboard.current_vec.length == 1) {
                        // PICKING A PIECE CASE
                        const piece: Piece = g.LabelPiece.get(label) as Piece
                        const moves: Array<Square> = g.find_valid_moves(piece)
                        vboard.current_vec = vboard.current_vec.concat(moves)
                    }
                    else if (is_move) {
                        // TAKE A PIECE
                        const piece: Piece = g.LabelPiece.get(vboard.current_vec[0].label) as Piece
                        g.make_move(vboard.current_vec[0], v_sq.real_sq)
                        vboard.draw_vector(vboard.current_vec, "default")
                        vboard.current_vec = []
                    }
                }
                
                if (g.global_update) { //problem here: after promotion queen img loads too slow to be displayed
                    vboard.draw_board()
                    vboard.draw_pieces(g.LabelPiece)
                    g.global_update = false
                }
                else{
                    vboard.draw_vector(vboard.current_vec, "active")
                }
                
            }
        }
        if (on_board == false) {
            vboard.draw_vector(vboard.current_vec, "default")
            vboard.current_vec = []
        }
    }
}


let app: App = new App()

window.onload = function() {
    app.draw()
}

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect()
    const x: Pixel = e.clientX - rect.left
    const y: Pixel = e.clientY - rect.top

    app.check_click(x, y)
})
