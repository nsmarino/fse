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
            if (this.target && this.targetCanBeAttacked) {
                this.inCombat = true
                this.combatTicking = true
                this.emitSignal("enter_combat")
            }
        }
        if (this.inCombat && this.combatTicking) {
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

            // TEMP:
            this.combatTicking = true
        }
    }


    onSignal(signalName, data={}) {
        switch(signalName) {
            case "active_target":
                this.target = true
                this.targetCanBeAttacked = data.canBeAttacked
                break;
            case "targeted_object":
                this.targetDistance = Avern.Player.transform.position.distanceTo(data.object.transform.position)
                break;
            case "clear_target":
                this.target = false
                // if (blah blah blah)
                this.inCombat = false // refine later to only leave combat if untargeted by all enemies
                this.emitSignal("end_combat")
                break;
            case "queue_action":
                break;
            case "action_crucial_frame":
                break;
            case "finish_attack_anim":
                this.combatTicking = true
                break;
        }
    }

    attachObservers(parent) {
        this.addObserver(parent.getComponent(Body))
        this.addObserver(parent.getComponent(Actions))
        // this.addObserver(parent.getComponent(Vitals))
        // this.addObserver(parent.getComponent(Inventory))
        // for (const enemy of Avern.State.Enemies) {
        //     this.addObserver(enemy.getComponent(Enemy))
        // }
    }
}

export default CombatMode