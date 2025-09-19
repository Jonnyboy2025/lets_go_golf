type HoleData = {
    holeNumber: number;
    par: number;
    tee: { lat: number; lng: number}
    green : { lat: number; lng: number}
    fairway: Array<{ lat: number; lng: number }>;
    hazards?: Array<Array<{ lat: number; lng: number }>>;
}