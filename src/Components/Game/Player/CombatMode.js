import GameplayComponent from '../../_Component';
import Actions from './Actions';
import Body from './Body';

class CombatMode extends GameplayComponent {
    constructor(gameObject, ) {
        super(gameObject)
        
        this.inCombat = false
        this.nextAction = null
        this.carryingOutAction = false
    
        this.roundInterval = 2
        this.combatTicking = false
        this.tick = 0

        this.target = false
        this.targetCanBeAttacked = false
        this.targetDistance = null
    }

    update(delta) {
        const inputs = Avern.Inputs.getInputs()

        if ( inputs.interact && !this.inCombat) {
            console.log("Interact, not in combat")
            if (this.target && this.targetCanBeAttacked) {
                console.log("Target can be attacked")
                this.inCombat = true
                this.combatTicking = true
                this.emitSignal("enter_combat")
            }
        }
        if (this.inCombat && this.combatTicking) {
            console.log("Tick inCombat")
            if (this.tick < this.roundInterval) {
                this.tick += delta
            } else {
                this.combatRound()
            }
        }
    }

    combatRound() {
        this.combatTicking = false
        this.tick = 0
        if (this.nextAction) {
            // ... Handle next action ...
            this.emitSignal("combat_round", { action: this.nextAction })
            console.log("Perform queued action!")
            this.nextAction = null
        } else {
            // perform Default Action (does not use energy or grant combat points...or do much damage)
            console.log("Perform default action!")
            this.emitSignal("combat_round", { action: null })
        }
    }


    onSignal(signalName, data={}) {
        switch(signalName) {
            case "active_target":
                this.target = true
                console.log("Recive data canBeAttacked", data)
                this.targetCanBeAttacked = data.canBeAttacked
                break;
            case "targeted_object":
                this.targetDistance = Avern.Player.transform.position.distanceTo(data.object.transform.position)
                break;
            case "clear_target":
                this.target = false
                this.inCombat = false // refine later to only leave combat if untargeted by all enemies
                break;
            case "start_combat":
                console.log("Start Combat")
                break;
            case "end_combat":
                console.log("Start Combat")
                break;
            case "queue_action":
                console.log("Next Action")
                break;
        }
    }

    attachObservers(parent) {
        this.addObserver(parent.getComponent(Actions))
        this.addObserver(parent.getComponent(Body))
        // this.addObserver(parent.getComponent(Vitals))
        // this.addObserver(parent.getComponent(Inventory))
        // for (const enemy of Avern.State.Enemies) {
        //     this.addObserver(enemy.getComponent(Enemy))
        // }
    }
}

export default CombatMode