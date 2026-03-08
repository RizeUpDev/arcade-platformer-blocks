//% color="#5C2D91" weight=90 icon="\uf135" block="Platformer"
//% groups=['Setup', 'Jumping', 'Ladder', 'Wall Mechanics', 'Dash', 'Movement', 'Detection', 'Tweaks', 'Combat']
namespace platformer {

    // =========================================================================
    // Internal State
    // =========================================================================

    interface PlatformerState {
        sprite: Sprite
        gravity: number
        jumpForce: number
        maxJumps: number
        jumpsLeft: number
        isOnGround: boolean
        coyoteTime: number
        coyoteTimer: number
        jumpBufferTime: number
        jumpBufferTimer: number
        wallSlide: boolean
        wallJumpForce: number
        dashSpeed: number
        dashDuration: number
        dashCooldown: number
        dashTimer: number
        dashCooldownTimer: number
        isDashing: boolean
        canDash: boolean
        facingRight: boolean
        maxFallSpeed: number
        // Ladder
        isClimbing: boolean
        nearLadder: boolean
        climbSpeed: number
        ladderSnapX: boolean
        ladderCenterX: number
        dismountJumpForce: number
    }

    const states: PlatformerState[] = []

    function getState(sprite: Sprite): PlatformerState {
        for (const s of states) {
            if (s.sprite === sprite) return s
        }
        const ns: PlatformerState = {
            sprite,
            gravity: 600,
            jumpForce: -300,
            maxJumps: 1,
            jumpsLeft: 1,
            isOnGround: false,
            coyoteTime: 100,
            coyoteTimer: 0,
            jumpBufferTime: 100,
            jumpBufferTimer: 0,
            wallSlide: false,
            wallJumpForce: -280,
            dashSpeed: 500,
            dashDuration: 150,
            dashCooldown: 800,
            dashTimer: 0,
            dashCooldownTimer: 0,
            isDashing: false,
            canDash: true,
            facingRight: true,
            maxFallSpeed: 600,
            isClimbing: false,
            nearLadder: false,
            climbSpeed: 60,
            ladderSnapX: true,
            ladderCenterX: 0,
            dismountJumpForce: -280
        }
        states.push(ns)
        return ns
    }

    function executeJump(sprite: Sprite, st: PlatformerState): void {
        sprite.vy = st.jumpForce
        st.jumpsLeft--
        st.jumpBufferTimer = 0
        st.coyoteTimer = 0
    }

    // =========================================================================
    // Core Update
    // =========================================================================

    function update(sprite: Sprite, dt: number): void {
        const st = getState(sprite)
        if (!st) return

        // ── Ground detection
        const wasOnGround = st.isOnGround
        st.isOnGround = sprite.isHittingTile(CollisionDirection.Bottom)

        if (!wasOnGround && st.isOnGround) {
            st.jumpsLeft = st.maxJumps
            st.canDash = true
            // Landing cancels climbing
            if (st.isClimbing) {
                st.isClimbing = false
                sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
            }
        }

        // ── If we left the ladder tile area, stop climbing
        if (st.isClimbing && !st.nearLadder) {
            st.isClimbing = false
            sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
        }

        // Reset nearLadder every frame — overlap callbacks re-set it
        st.nearLadder = false

        // ── Coyote time (not while climbing)
        if (!st.isClimbing) {
            if (wasOnGround && !st.isOnGround) {
                st.coyoteTimer = st.coyoteTime
            }
            if (st.coyoteTimer > 0) st.coyoteTimer -= dt
        }

        // ── Jump buffer
        if (st.jumpBufferTimer > 0) {
            st.jumpBufferTimer -= dt
            if (st.isOnGround || st.coyoteTimer > 0) {
                executeJump(sprite, st)
            }
        }

        // ── Climbing mode: skip gravity, lock X to center of ladder
        if (st.isClimbing) {
            sprite.vy = 0
            if (st.ladderSnapX) {
                sprite.x += (st.ladderCenterX - sprite.x) * 0.3
            }
            return
        }

        // ── Gravity (skip while dashing)
        if (!st.isDashing) {
            sprite.vy += (st.gravity * dt) / 1000
            if (sprite.vy > st.maxFallSpeed) sprite.vy = st.maxFallSpeed
        }

        // ── Wall slide
        if (st.wallSlide && !st.isOnGround && sprite.vy > 0) {
            if (
                sprite.isHittingTile(CollisionDirection.Left) ||
                sprite.isHittingTile(CollisionDirection.Right)
            ) {
                if (sprite.vy > 80) sprite.vy = 80
            }
        }

        // ── Dash timer
        if (st.isDashing) {
            st.dashTimer -= dt
            if (st.dashTimer <= 0) {
                st.isDashing = false
                sprite.vx = st.facingRight ? 150 : -150
            }
        }

        // ── Dash cooldown
        if (st.dashCooldownTimer > 0) st.dashCooldownTimer -= dt
    }

    // =========================================================================
    // SECTION: Setup
    // =========================================================================

    /**
     * Initialize platformer physics for a sprite.
     * Call this once after creating your sprite.
     * @param sprite the player sprite
     * @param gravity downward acceleration in px/sec², eg: 600
     * @param jumpForce upward velocity on jump (negative = up), eg: -300
     */
    //% group="Setup"
    //% block="set up platformer for $sprite || gravity $gravity jump force $jumpForce"
    //% sprite.shadow=variables_get
    //% gravity.defl=600
    //% jumpForce.defl=-300
    //% weight=100
    export function setup(
        sprite: Sprite,
        gravity: number = 600,
        jumpForce: number = -300
    ): void {
        const st = getState(sprite)
        st.gravity = gravity
        st.jumpForce = jumpForce
        sprite.setFlag(SpriteFlag.StayInScreen, false)
        game.onUpdate(function () {
            update(sprite, game.eventContext().deltaTimeMillis)
        })
    }

    /**
     * Set gravity for a sprite.
     * @param sprite the player sprite
     * @param gravity pixels per second squared, eg: 600
     */
    //% group="Setup"
    //% block="set $sprite gravity to $gravity"
    //% sprite.shadow=variables_get
    //% gravity.defl=600
    //% weight=95
    export function setGravity(sprite: Sprite, gravity: number): void {
        getState(sprite).gravity = gravity
    }

    /**
     * Set maximum fall speed to prevent infinite acceleration.
     * @param sprite the player sprite
     * @param speed max downward velocity, eg: 600
     */
    //% group="Setup"
    //% block="set $sprite max fall speed to $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=600
    //% weight=90
    export function setMaxFallSpeed(sprite: Sprite, speed: number): void {
        getState(sprite).maxFallSpeed = speed
    }

    // =========================================================================
    // SECTION: Jumping
    // =========================================================================

    /**
     * Make the sprite jump. Respects double-jump, coyote time,
     * and jump buffering. If called while climbing a ladder,
     * the sprite dismounts and jumps.
     * @param sprite the player sprite
     */
    //% group="Jumping"
    //% block="jump $sprite"
    //% sprite.shadow=variables_get
    //% weight=100
    export function jump(sprite: Sprite): void {
        const st = getState(sprite)

        // Dismount ladder jump
        if (st.isClimbing) {
            st.isClimbing = false
            sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
            sprite.vy = st.dismountJumpForce
            st.jumpsLeft = st.maxJumps - 1
            return
        }

        const canJumpNow = st.isOnGround || st.coyoteTimer > 0 || st.jumpsLeft > 0
        if (canJumpNow && st.jumpsLeft > 0) {
            executeJump(sprite, st)
        } else if (!st.isOnGround && st.jumpsLeft <= 0) {
            st.jumpBufferTimer = st.jumpBufferTime
        }
    }

    /**
     * Cut jump height early — call when the jump button is released
     * for variable-height jumps.
     * @param sprite the player sprite
     * @param cutFactor how much to reduce upward speed (0.0–1.0), eg: 0.5
     */
    //% group="Jumping"
    //% block="cut jump height for $sprite by $cutFactor"
    //% sprite.shadow=variables_get
    //% cutFactor.defl=0.5
    //% weight=95
    export function cutJump(sprite: Sprite, cutFactor: number = 0.5): void {
        if (sprite.vy < 0) sprite.vy *= cutFactor
    }

    /**
     * Set the maximum number of jumps allowed per ground contact.
     * 1 = normal, 2 = double jump, etc.
     * @param sprite the player sprite
     * @param count number of jumps, eg: 2
     */
    //% group="Jumping"
    //% block="set $sprite max jumps to $count"
    //% sprite.shadow=variables_get
    //% count.defl=2
    //% weight=90
    export function setMaxJumps(sprite: Sprite, count: number): void {
        const st = getState(sprite)
        st.maxJumps = count
        st.jumpsLeft = count
    }

    /**
     * Set coyote time — grace period after walking off a ledge
     * where the player can still jump.
     * @param sprite the player sprite
     * @param ms milliseconds of coyote time, eg: 100
     */
    //% group="Jumping"
    //% block="set $sprite coyote time to $ms ms"
    //% sprite.shadow=variables_get
    //% ms.defl=100
    //% weight=85
    export function setCoyoteTime(sprite: Sprite, ms: number): void {
        getState(sprite).coyoteTime = ms
    }

    /**
     * Set jump buffer — pressing jump this many ms before landing
     * still triggers a jump on touchdown.
     * @param sprite the player sprite
     * @param ms milliseconds of buffer, eg: 100
     */
    //% group="Jumping"
    //% block="set $sprite jump buffer to $ms ms"
    //% sprite.shadow=variables_get
    //% ms.defl=100
    //% weight=80
    export function setJumpBuffer(sprite: Sprite, ms: number): void {
        getState(sprite).jumpBufferTime = ms
    }

    // =========================================================================
    // SECTION: Ladder
    // =========================================================================

    /**
     * Register a tile image as a climbable ladder for a sprite.
     * Call this once during setup — it hooks the overlap event so the
     * extension knows when the sprite is touching a ladder tile.
     * @param sprite the player sprite
     * @param tile the ladder tile image from your tilemap
     */
    //% group="Ladder"
    //% block="register ladder tile $tile for $sprite"
    //% sprite.shadow=variables_get
    //% tile.shadow=tileset_tile_picker
    //% weight=100
    export function registerLadderTile(sprite: Sprite, tile: Image): void {
        const st = getState(sprite)
        // Fires every frame the sprite overlaps the tile
        scene.onOverlapTile(sprite.kind(), tile, function (s: Sprite, location: tiles.Location) {
            if (s === sprite) {
                const stateCurrent = getState(sprite)
                stateCurrent.nearLadder = true
                // Store the horizontal center of the ladder tile so we can snap to it
                stateCurrent.ladderCenterX = location.column * 16 + 8
            }
        })
    }

    /**
     * Grab the ladder — the sprite enters climbing mode.
     * Call this when the player presses Up or Down while nearLadder is true.
     * Does nothing if the sprite is not near a ladder tile.
     * @param sprite the player sprite
     */
    //% group="Ladder"
    //% block="grab ladder $sprite"
    //% sprite.shadow=variables_get
    //% weight=95
    export function grabLadder(sprite: Sprite): void {
        const st = getState(sprite)
        if (!st.nearLadder || st.isClimbing) return
        st.isClimbing = true
        sprite.vy = 0
        sprite.vx = 0
        // Ghost through wall tiles so the sprite can pass ladder tops freely
        sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
    }

    /**
     * Release the ladder — the sprite falls normally again.
     * @param sprite the player sprite
     */
    //% group="Ladder"
    //% block="release ladder $sprite"
    //% sprite.shadow=variables_get
    //% weight=92
    export function releaseLadder(sprite: Sprite): void {
        const st = getState(sprite)
        st.isClimbing = false
        sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
    }

    /**
     * Climb up or down the ladder. Call every frame while Up or Down
     * is held. Positive speed = climb down, negative speed = climb up.
     * Automatically calls grabLadder if the sprite is near one.
     * @param sprite the player sprite
     * @param speed vertical climb speed — negative = up, positive = down, eg: -60
     */
    //% group="Ladder"
    //% block="climb $sprite at speed $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=-60
    //% weight=90
    export function climbLadder(sprite: Sprite, speed: number): void {
        const st = getState(sprite)
        if (!st.nearLadder) return
        if (!st.isClimbing) grabLadder(sprite)
        sprite.vy = speed
    }

    /**
     * Set the default climb speed used as a reference value.
     * @param sprite the player sprite
     * @param speed pixels per second, eg: 60
     */
    //% group="Ladder"
    //% block="set $sprite climb speed to $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=60
    //% weight=88
    export function setClimbSpeed(sprite: Sprite, speed: number): void {
        getState(sprite).climbSpeed = speed
    }

    /**
     * Set the jump force applied when jumping off a ladder.
     * @param sprite the player sprite
     * @param force upward force (negative = up), eg: -280
     */
    //% group="Ladder"
    //% block="set $sprite ladder dismount jump force $force"
    //% sprite.shadow=variables_get
    //% force.defl=-280
    //% weight=85
    export function setDismountJumpForce(sprite: Sprite, force: number): void {
        getState(sprite).dismountJumpForce = force
    }

    /**
     * Enable or disable snapping the sprite to the horizontal
     * center of the ladder tile while climbing.
     * @param sprite the player sprite
     * @param enabled true to snap to center, eg: true
     */
    //% group="Ladder"
    //% block="set $sprite ladder snap to center $enabled"
    //% sprite.shadow=variables_get
    //% enabled.shadow=toggleOnOff
    //% weight=82
    export function setLadderSnap(sprite: Sprite, enabled: boolean): void {
        getState(sprite).ladderSnapX = enabled
    }

    /**
     * Returns true if the sprite is currently climbing a ladder.
     * @param sprite the player sprite
     */
    //% group="Ladder"
    //% block="$sprite is climbing"
    //% sprite.shadow=variables_get
    //% weight=78
    export function isClimbing(sprite: Sprite): boolean {
        return getState(sprite).isClimbing
    }

    /**
     * Returns true if the sprite is touching a ladder tile this frame.
     * Use this to decide whether to call grabLadder or climbLadder.
     * @param sprite the player sprite
     */
    //% group="Ladder"
    //% block="$sprite is near ladder"
    //% sprite.shadow=variables_get
    //% weight=75
    export function isNearLadder(sprite: Sprite): boolean {
        return getState(sprite).nearLadder
    }

    // =========================================================================
    // SECTION: Wall Mechanics
    // =========================================================================

    /**
     * Enable or disable wall sliding for a sprite.
     * @param sprite the player sprite
     * @param enabled true to allow wall sliding
     */
    //% group="Wall Mechanics"
    //% block="set wall slide for $sprite $enabled"
    //% sprite.shadow=variables_get
    //% enabled.shadow=toggleOnOff
    //% weight=100
    export function setWallSlide(sprite: Sprite, enabled: boolean): void {
        getState(sprite).wallSlide = enabled
    }

    /**
     * Perform a wall jump — pushes the sprite away from the wall and upward.
     * @param sprite the player sprite
     */
    //% group="Wall Mechanics"
    //% block="wall jump $sprite"
    //% sprite.shadow=variables_get
    //% weight=95
    export function wallJump(sprite: Sprite): void {
        const st = getState(sprite)
        const touchLeft = sprite.isHittingTile(CollisionDirection.Left)
        const touchRight = sprite.isHittingTile(CollisionDirection.Right)
        if (touchLeft) {
            sprite.vx = 200
            sprite.vy = st.wallJumpForce
            st.jumpsLeft = st.maxJumps - 1
        } else if (touchRight) {
            sprite.vx = -200
            sprite.vy = st.wallJumpForce
            st.jumpsLeft = st.maxJumps - 1
        }
    }

    /**
     * Set the upward force applied during a wall jump.
     * @param sprite the player sprite
     * @param force upward velocity (negative = up), eg: -280
     */
    //% group="Wall Mechanics"
    //% block="set $sprite wall jump force to $force"
    //% sprite.shadow=variables_get
    //% force.defl=-280
    //% weight=90
    export function setWallJumpForce(sprite: Sprite, force: number): void {
        getState(sprite).wallJumpForce = force
    }

    /**
     * Returns true if the sprite is touching a wall on either side.
     * @param sprite the player sprite
     */
    //% group="Wall Mechanics"
    //% block="$sprite is on wall"
    //% sprite.shadow=variables_get
    //% weight=85
    export function isOnWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Left) ||
            sprite.isHittingTile(CollisionDirection.Right)
    }

    /**
     * Returns true if the sprite is touching a wall on the left.
     * @param sprite the player sprite
     */
    //% group="Wall Mechanics"
    //% block="$sprite is on left wall"
    //% sprite.shadow=variables_get
    //% weight=82
    export function isOnLeftWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Left)
    }

    /**
     * Returns true if the sprite is touching a wall on the right.
     * @param sprite the player sprite
     */
    //% group="Wall Mechanics"
    //% block="$sprite is on right wall"
    //% sprite.shadow=variables_get
    //% weight=80
    export function isOnRightWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Right)
    }

    // =========================================================================
    // SECTION: Dash
    // =========================================================================

    /**
     * Dash in the direction the sprite is currently facing.
     * Gravity is disabled during the dash. One dash per air trip.
     * @param sprite the player sprite
     */
    //% group="Dash"
    //% block="dash $sprite"
    //% sprite.shadow=variables_get
    //% weight=100
    export function dash(sprite: Sprite): void {
        const st = getState(sprite)
        if (!st.canDash || st.isDashing || st.dashCooldownTimer > 0) return
        if (st.isClimbing) return     // no dashing off ladders
        st.isDashing = true
        st.canDash = false
        st.dashTimer = st.dashDuration
        st.dashCooldownTimer = st.dashCooldown
        sprite.vy = 0
        sprite.vx = st.facingRight ? st.dashSpeed : -st.dashSpeed
    }

    /**
     * Configure all dash properties at once.
     * @param sprite the player sprite
     * @param speed dash speed in px/sec, eg: 500
     * @param durationMs how long the dash lasts in ms, eg: 150
     * @param cooldownMs cooldown between dashes in ms, eg: 800
     */
    //% group="Dash"
    //% block="set $sprite dash speed $speed duration $durationMs ms cooldown $cooldownMs ms"
    //% sprite.shadow=variables_get
    //% speed.defl=500
    //% durationMs.defl=150
    //% cooldownMs.defl=800
    //% weight=95
    export function setDash(
        sprite: Sprite,
        speed: number,
        durationMs: number,
        cooldownMs: number
    ): void {
        const st = getState(sprite)
        st.dashSpeed = speed
        st.dashDuration = durationMs
        st.dashCooldown = cooldownMs
    }

    /**
     * Set dash speed separately.
     * @param sprite the player sprite
     * @param speed pixels per second, eg: 500
     */
    //% group="Dash"
    //% block="set $sprite dash speed to $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=500
    //% weight=90
    export function setDashSpeed(sprite: Sprite, speed: number): void {
        getState(sprite).dashSpeed = speed
    }

    /**
     * Set how long a dash lasts.
     * @param sprite the player sprite
     * @param ms duration in milliseconds, eg: 150
     */
    //% group="Dash"
    //% block="set $sprite dash duration to $ms ms"
    //% sprite.shadow=variables_get
    //% ms.defl=150
    //% weight=88
    export function setDashDuration(sprite: Sprite, ms: number): void {
        getState(sprite).dashDuration = ms
    }

    /**
     * Set the cooldown between dashes.
     * @param sprite the player sprite
     * @param ms cooldown in milliseconds, eg: 800
     */
    //% group="Dash"
    //% block="set $sprite dash cooldown to $ms ms"
    //% sprite.shadow=variables_get
    //% ms.defl=800
    //% weight=86
    export function setDashCooldown(sprite: Sprite, ms: number): void {
        getState(sprite).dashCooldown = ms
    }

    // =========================================================================
    // SECTION: Movement
    // =========================================================================

    /**
     * Move the sprite left or right. Tracks facing direction for dash.
     * Skips during an active dash. Reduces horizontal speed while climbing.
     * @param sprite the player sprite
     * @param speed positive = right, negative = left, eg: 150
     */
    //% group="Movement"
    //% block="move $sprite horizontally at speed $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=150
    //% weight=100
    export function moveHorizontal(sprite: Sprite, speed: number): void {
        const st = getState(sprite)
        if (st.isDashing) return
        if (st.isClimbing) {
            // Allow slight horizontal movement on ladder but don't cancel climb
            sprite.vx = speed * 0.3
            return
        }
        sprite.vx = speed
        if (speed > 0) st.facingRight = true
        if (speed < 0) st.facingRight = false
    }

    /**
     * Manually set the facing direction used by dash.
     * @param sprite the player sprite
     * @param facingRight true = facing right, false = facing left
     */
    //% group="Movement"
    //% block="set $sprite facing right $facingRight"
    //% sprite.shadow=variables_get
    //% facingRight.shadow=toggleOnOff
    //% weight=90
    export function setFacing(sprite: Sprite, facingRight: boolean): void {
        getState(sprite).facingRight = facingRight
    }

    /**
     * Returns true if the sprite is currently facing right.
     * @param sprite the player sprite
     */
    //% group="Movement"
    //% block="$sprite is facing right"
    //% sprite.shadow=variables_get
    //% weight=85
    export function isFacingRight(sprite: Sprite): boolean {
        return getState(sprite).facingRight
    }

    // =========================================================================
    // SECTION: Detection
    // =========================================================================

    /**
     * Returns true if the sprite is standing on the ground.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is on ground"
    //% sprite.shadow=variables_get
    //% weight=100
    export function isOnGround(sprite: Sprite): boolean {
        return getState(sprite).isOnGround
    }

    /**
     * Returns true if the sprite is falling downward and not on the ground.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is falling"
    //% sprite.shadow=variables_get
    //% weight=95
    export function isFalling(sprite: Sprite): boolean {
        return sprite.vy > 0 && !getState(sprite).isOnGround
    }

    /**
     * Returns true if the sprite is moving upward after a jump.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is rising"
    //% sprite.shadow=variables_get
    //% weight=90
    export function isRising(sprite: Sprite): boolean {
        return sprite.vy < 0
    }

    /**
     * Returns true if the sprite is currently dashing.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is dashing"
    //% sprite.shadow=variables_get
    //% weight=85
    export function isDashing(sprite: Sprite): boolean {
        return getState(sprite).isDashing
    }

    /**
     * Returns how many jumps the sprite has remaining.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite jumps remaining"
    //% sprite.shadow=variables_get
    //% weight=80
    export function jumpsRemaining(sprite: Sprite): number {
        return getState(sprite).jumpsLeft
    }

    // =========================================================================
    // SECTION: Tweaks
    // =========================================================================

    /**
     * Set horizontal velocity directly. Skips during a dash.
     * @param sprite the player sprite
     * @param vx horizontal velocity, eg: 200
     */
    //% group="Tweaks"
    //% block="set $sprite horizontal velocity to $vx"
    //% sprite.shadow=variables_get
    //% vx.defl=200
    //% weight=100
    export function setVx(sprite: Sprite, vx: number): void {
        if (!getState(sprite).isDashing) sprite.vx = vx
    }

    /**
     * Set vertical velocity directly.
     * @param sprite the player sprite
     * @param vy vertical velocity (negative = up), eg: -400
     */
    //% group="Tweaks"
    //% block="set $sprite vertical velocity to $vy"
    //% sprite.shadow=variables_get
    //% vy.defl=-400
    //% weight=95
    export function setVy(sprite: Sprite, vy: number): void {
        sprite.vy = vy
    }

    /**
     * Add an impulse to the sprite. Useful for bouncy platforms.
     * @param sprite the player sprite
     * @param vx horizontal impulse, eg: 0
     * @param vy vertical impulse (negative = up), eg: -200
     */
    //% group="Tweaks"
    //% block="add impulse to $sprite vx $vx vy $vy"
    //% sprite.shadow=variables_get
    //% vx.defl=0
    //% vy.defl=-200
    //% weight=90
    export function addImpulse(sprite: Sprite, vx: number, vy: number): void {
        sprite.vx += vx
        sprite.vy += vy
    }

    /**
     * Restore the sprite's dash before landing (for mid-air dash pickups).
     * @param sprite the player sprite
     */
    //% group="Tweaks"
    //% block="restore $sprite dash"
    //% sprite.shadow=variables_get
    //% weight=85
    export function restoreDash(sprite: Sprite): void {
        const st = getState(sprite)
        st.canDash = true
        st.dashCooldownTimer = 0
    }

    /**
     * Restore all jumps immediately (for jump-refill pickups).
     * @param sprite the player sprite
     */
    //% group="Tweaks"
    //% block="restore $sprite jumps"
    //% sprite.shadow=variables_get
    //% weight=80
    export function restoreJumps(sprite: Sprite): void {
        const st = getState(sprite)
        st.jumpsLeft = st.maxJumps
    }

    // =========================================================================
    // SECTION: Combat
    // =========================================================================

    /**
     * Knock the sprite back — direction is reversed from current facing.
     * @param sprite the player sprite
     * @param forceX horizontal knockback speed, eg: 200
     * @param forceY vertical knockback (negative = up), eg: -150
     */
    //% group="Combat"
    //% block="knock back $sprite vx $forceX vy $forceY"
    //% sprite.shadow=variables_get
    //% forceX.defl=200
    //% forceY.defl=-150
    //% weight=100
    export function knockback(sprite: Sprite, forceX: number, forceY: number): void {
        const st = getState(sprite)
        // Knockback cancels climbing
        if (st.isClimbing) {
            st.isClimbing = false
            sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
        }
        sprite.vx = st.facingRight ? -Math.abs(forceX) : Math.abs(forceX)
        sprite.vy = forceY
    }

    /**
     * Knock the sprite away from a source position.
     * @param sprite the player sprite
     * @param sourceX X of the damage source, eg: 0
     * @param sourceY Y of the damage source, eg: 0
     * @param force push strength, eg: 250
     */
    //% group="Combat"
    //% block="knock $sprite away from x $sourceX y $sourceY with force $force"
    //% sprite.shadow=variables_get
    //% sourceX.defl=0
    //% sourceY.defl=0
    //% force.defl=250
    //% weight=95
    export function knockbackFromPoint(
        sprite: Sprite,
        sourceX: number,
        sourceY: number,
        force: number
    ): void {
        const st = getState(sprite)
        if (st.isClimbing) {
            st.isClimbing = false
            sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
        }
        const dx = sprite.x - sourceX
        const dy = sprite.y - sourceY
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        sprite.vx = (dx / len) * force
        sprite.vy = (dy / len) * force
    }

    /**
     * Launch the sprite upward — for bounce pads or stomp bounces.
     * @param sprite the player sprite
     * @param force upward launch speed (positive, direction auto-applied), eg: 350
     */
    //% group="Combat"
    //% block="launch $sprite upward with force $force"
    //% sprite.shadow=variables_get
    //% force.defl=350
    //% weight=90
    export function launch(sprite: Sprite, force: number): void {
        const st = getState(sprite)
        if (st.isClimbing) {
            st.isClimbing = false
            sprite.setFlag(SpriteFlag.GhostThroughWalls, false)
        }
        sprite.vy = -Math.abs(force)
        st.jumpsLeft = st.maxJumps
    }
}