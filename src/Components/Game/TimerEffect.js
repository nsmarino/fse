import GameplayComponent from '../_Component';


// The idea here is that this is used for buffs debuffs, DOTs, HOTs, and is attached as a component
// to both player and enemies

// Haven't decided yet if I should use setTimeout / setInterval or just a update countup
class TimerEffectManager extends GameplayComponent {
    constructor(gameObject, ) {
        super(gameObject)

        this.timerEffects = []
    }

    update() {
        for (effect of this.timerEffects) {
            console.log("Timer effect")
        }
    }

    onSignal(signalName, data={}) {
        switch(signalName) {
          case "set_timer_effect":
            console.log("Set timer effect")
            break;
        }
    }
}

export default TimerEffectManager