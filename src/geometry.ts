import { Point, Align } from './squares'

export const ALIGN_TO_OFFSET = {"t":[1, 0], "b": [1, 2], "x": [2, 1], "y": [0, 1]};
type Pixel = number

export function get_angles(loop: Array<Point>, angle: number=180): Array<Array<number>> {
    let d_theta: number = angle / loop.length
    let total_angles: number = 200;
    let all_angles: Array<Array<number>> = [];

    for (let i = 0; i < loop.length; i++) {
        let angles: Array<number> = [];
        for (let j = 0; j < total_angles; j++){
            angles.push((i + j / total_angles) * d_theta )
        }         
        all_angles.push(angles);
   }
    return all_angles;
}

export function get_coords(angles: Array<Array<number>>, radii: Array<number>, 
                    anchor_loc: Array<number>, align: Align, 
                    SQ_W: number, base_board_indices): any {
    const ALIGN_TO_ORIENT = {"t": [-1, 0, 0, 1], "b": [-1, 0, 0, -1], "x": [0, -1, 1, 0], "y": [0, 1, 1, 0]};
    const [r1, r2] = radii;
    const [ax, ay] = anchor_loc;
    
    let midpoints = [];
    let curve_points = [];

    let flip: number = 1
    if ((align == 'x' || align == 'y')) {
        const b_inds = base_board_indices
        const mid_y: number =  b_inds[1] + (b_inds[3] - b_inds[1]) / 2
        if (ay / SQ_W > mid_y) {
            flip = -1
        }
    }

    // Compute midpoint
    const len: number = angles.length-1;
    
    for (let angle of angles){
        let orient = ALIGN_TO_ORIENT[align]
        const mid_angle: number = angle[0] + (angle[angle.length-1] - angle[0])/2;
        const mid_rad: number = mid_angle * Math.PI / 180;
        let xm: number = ax + (r1+0.5) * (orient[0] * Math.cos(mid_rad) + orient[1] * Math.sin(mid_rad)) * SQ_W;
        let ym: number = ay + (r1+0.5) * (orient[2] * flip * Math.cos(mid_rad) + orient[3] * flip * Math.sin(mid_rad)) * SQ_W;
        let r1_points = []; //type these later!
        let r2_points = [];
        midpoints.push([xm, ym])
        for (let subangle of angle) {
            let rad: number = subangle * Math.PI / 180;
            
            let x: number = orient[0] * Math.cos(rad) + orient[1] * Math.sin(rad)
            let y: number = orient[2] * Math.cos(rad) + orient[3] * Math.sin(rad)
            y *= flip

            let x1: number = ax + r1 * x * SQ_W;
            let y1: number = ay + r1 * y * SQ_W;
            let x2: number = ax + r2 * x * SQ_W;
            let y2: number = ay + r2 * y * SQ_W;

            r1_points.push([x1, y1]);
            r2_points.push([x2, y2]);
        }
        r2_points = r2_points.reverse();
        const points: Array<Point> = r1_points.concat(r2_points);
        curve_points.push(points)
    }
    
    return [curve_points, midpoints];
}
