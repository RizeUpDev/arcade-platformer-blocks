namespace platformer {

    // ─── Internal State ───────────────────────────────────────────────────────

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
            maxFallSpeed: 600
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

    // ─── Core Update Loop (internal, no block) ────────────────────────────────

    function update(sprite: Sprite, dt: number): void {
        const st = getState(sprite)
        if (!st) return

        const wasOnGround = st.isOnGround
        st.isOnGround = sprite.isHittingTile(CollisionDirection.Bottom)

        if (!wasOnGround && st.isOnGround) {
            st.jumpsLeft = st.maxJumps
            st.canDash = true
        }

        if (wasOnGround && !st.isOnGround) {
            st.coyoteTimer = st.coyoteTime
        }
        if (st.coyoteTimer > 0) {
            st.coyoteTimer -= dt
        }

        if (st.jumpBufferTimer > 0) {
            st.jumpBufferTimer -= dt
            if (st.isOnGround || st.coyoteTimer > 0) {
                executeJump(sprite, st)
            }
        }

        if (!st.isDashing) {
            sprite.vy += (st.gravity * dt) / 1000
            if (sprite.vy > st.maxFallSpeed) {
                sprite.vy = st.maxFallSpeed
            }
        }

        if (st.wallSlide && !st.isOnGround && sprite.vy > 0) {
            const touchLeft = sprite.isHittingTile(CollisionDirection.Left)
            const touchRight = sprite.isHittingTile(CollisionDirection.Right)
            if (touchLeft || touchRight) {
                if (sprite.vy > 80) sprite.vy = 80
            }
        }

        if (st.isDashing) {
            st.dashTimer -= dt
            if (st.dashTimer <= 0) {
                st.isDashing = false
                sprite.vx = st.facingRight ? 150 : -150
            }
        }

        if (st.dashCooldownTimer > 0) {
            st.dashCooldownTimer -= dt
        }
    }

    // =========================================================================
    // SECTION: Setup
    // =========================================================================

    /**
     * Initialize platformer physics for a sprite.
     * Call this once after creating your sprite.
     * @param sprite the player sprite
     * @param gravity downward acceleration (pixels/sec²), eg: 600
     * @param jumpForce upward velocity on jump (negative = up), eg: -300
     */
    //% group="Setup"
    //% block="set up platformer for $sprite || gravity $gravity jump force $jumpForce"
    //% sprite.shadow=variables_get
    //% gravity.defl=600
    //% jumpForce.defl=-300
    //% weight=100
    export function setup(sprite: Sprite, gravity: number = 600, jumpForce: number = -300): void {
        const st2 = getState(sprite)
        st2.gravity = gravity
        st2.jumpForce = jumpForce
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
     * Make the sprite jump.
     * Respects double-jump count, coyote time, and jump buffering.
     * @param sprite the player sprite
     */
    //% group="Jumping"
    //% block="jump $sprite"
    //% sprite.shadow=variables_get
    //% weight=100
    export function jump(sprite: Sprite): void {
        const st3 = getState(sprite)
        const canJumpNow = st3.isOnGround || st3.coyoteTimer > 0 || st3.jumpsLeft > 0
        if (canJumpNow && st3.jumpsLeft > 0) {
            executeJump(sprite, st3)
        } else if (!st3.isOnGround && st3.jumpsLeft <= 0) {
            st3.jumpBufferTimer = st3.jumpBufferTime
        }
    }

    /**
     * Cut jump height early — call when the jump button is released
     * for variable-height jumps (short hop vs full jump).
     * @param sprite the player sprite
     * @param cutFactor how much to reduce upward speed (0.0–1.0), eg: 0.5
     */
    //% group="Jumping"
    //% block="cut jump height for $sprite by $cutFactor"
    //% sprite.shadow=variables_get
    //% cutFactor.defl=0.5
    //% weight=95
    export function cutJump(sprite: Sprite, cutFactor: number = 0.5): void {
        if (sprite.vy < 0) {
            sprite.vy *= cutFactor
        }
    }

    /**
     * Set the maximum number of jumps allowed per ground contact.
     * 1 = normal, 2 = double jump, 3 = triple jump, etc.
     * @param sprite the player sprite
     * @param count number of jumps allowed, eg: 2
     */
    //% group="Jumping"
    //% block="set $sprite max jumps to $count"
    //% sprite.shadow=variables_get
    //% count.defl=2
    //% weight=90
    export function setMaxJumps(sprite: Sprite, count: number): void {
        const st4 = getState(sprite)
        st4.maxJumps = count
        st4.jumpsLeft = count
    }

    /**
     * Set coyote time — the grace period (in ms) after walking off a
     * ledge during which the player can still jump.
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
     * will still trigger a jump on touchdown.
     * @param sprite the player sprite
     * @param ms milliseconds of buffer window, eg: 100
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
    // SECTION: Wall Mechanics
    // =========================================================================

    /**
     * Enable or disable wall sliding for a sprite.
     * While sliding, falling speed is capped so the player glides down walls.
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
     * Call this when the player presses jump while touching a wall.
     * @param sprite the player sprite
     */
    //% group="Wall Mechanics"
    //% block="wall jump $sprite"
    //% sprite.shadow=variables_get
    //% weight=95
    export function wallJump(sprite: Sprite): void {
        const st5 = getState(sprite)
        const touchLeft2 = sprite.isHittingTile(CollisionDirection.Left)
        const touchRight2 = sprite.isHittingTile(CollisionDirection.Right)
        if (touchLeft2) {
            sprite.vx = 200
            sprite.vy = st5.wallJumpForce
            st5.jumpsLeft = st5.maxJumps - 1
        } else if (touchRight2) {
            sprite.vx = -200
            sprite.vy = st5.wallJumpForce
            st5.jumpsLeft = st5.maxJumps - 1
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
        const st6 = getState(sprite)
        if (!st6.canDash || st6.isDashing || st6.dashCooldownTimer > 0) return
        st6.isDashing = true
        st6.canDash = false
        st6.dashTimer = st6.dashDuration
        st6.dashCooldownTimer = st6.dashCooldown
        sprite.vy = 0
        sprite.vx = st6.facingRight ? st6.dashSpeed : -st6.dashSpeed
    }

    /**
     * Configure all dash properties at once.
     * @param sprite the player sprite
     * @param speed dash speed in pixels/sec, eg: 500
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
    export function setDash(sprite: Sprite, speed: number, durationMs: number, cooldownMs: number): void {
        const st7 = getState(sprite)
        st7.dashSpeed = speed
        st7.dashDuration = durationMs
        st7.dashCooldown = cooldownMs
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
     * Move the sprite left or right, tracking facing direction for dash.
     * Call this every frame inside game.onUpdate. Automatically skips
     * during an active dash so the dash is not interrupted.
     * @param sprite the player sprite
     * @param speed horizontal speed — positive = right, negative = left, eg: 150
     */
    //% group="Movement"
    //% block="move $sprite horizontally at speed $speed"
    //% sprite.shadow=variables_get
    //% speed.defl=150
    //% weight=100
    export function moveHorizontal(sprite: Sprite, speed: number): void {
        const st8 = getState(sprite)
        if (st8.isDashing) return
        sprite.vx = speed
        if (speed > 0) st8.facingRight = true
        if (speed < 0) st8.facingRight = false
    }

    /**
     * Manually set the facing direction used by dash.
     * Useful if you flip the sprite's image independently.
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
     * Returns true if the sprite is touching a wall on either side.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is on wall"
    //% sprite.shadow=variables_get
    //% weight=95
    export function isOnWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Left) ||
            sprite.isHittingTile(CollisionDirection.Right)
    }

    /**
     * Returns true if the sprite is touching a wall on the left side.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is on left wall"
    //% sprite.shadow=variables_get
    //% weight=93
    export function isOnLeftWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Left)
    }

    /**
     * Returns true if the sprite is touching a wall on the right side.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is on right wall"
    //% sprite.shadow=variables_get
    //% weight=91
    export function isOnRightWall(sprite: Sprite): boolean {
        return sprite.isHittingTile(CollisionDirection.Right)
    }

    /**
     * Returns true if the sprite is falling downward and not on the ground.
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is falling"
    //% sprite.shadow=variables_get
    //% weight=88
    export function isFalling(sprite: Sprite): boolean {
        return sprite.vy > 0 && !getState(sprite).isOnGround
    }

    /**
     * Returns true if the sprite is moving upward (rising after a jump).
     * @param sprite the player sprite
     */
    //% group="Detection"
    //% block="$sprite is rising"
    //% sprite.shadow=variables_get
    //% weight=85
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
    //% weight=82
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
    //% weight=78
    export function jumpsRemaining(sprite: Sprite): number {
        return getState(sprite).jumpsLeft
    }

    // =========================================================================
    // SECTION: Tweaks
    // =========================================================================

    /**
     * Directly set the sprite's horizontal velocity.
     * Useful for conveyor belts, ice physics, or scripted movement.
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
     * Directly set the sprite's vertical velocity.
     * Useful for launching pads, special jumps, or scripted sequences.
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
     * Add velocity to the sprite (impulse). Useful for bouncy platforms.
     * @param sprite the player sprite
     * @param vx horizontal impulse to add, eg: 0
     * @param vy vertical impulse to add (negative = up), eg: -200
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
     * Restore the sprite's dash so it can dash again before landing.
     * Useful for dash-refill pickups or mid-air resets.
     * @param sprite the player sprite
     */
    //% group="Tweaks"
    //% block="restore $sprite dash"
    //% sprite.shadow=variables_get
    //% weight=85
    export function restoreDash(sprite: Sprite): void {
        const st9 = getState(sprite)
        st9.canDash = true
        st9.dashCooldownTimer = 0
    }

    /**
     * Restore all jumps immediately, as if the sprite just landed.
     * Useful for jump-refill pickups.
     * @param sprite the player sprite
     */
    //% group="Tweaks"
    //% block="restore $sprite jumps"
    //% sprite.shadow=variables_get
    //% weight=80
    export function restoreJumps(sprite: Sprite): void {
        const st10 = getState(sprite)
        st10.jumpsLeft = st10.maxJumps
    }

    // =========================================================================
    // SECTION: Combat
    // =========================================================================

    /**
     * Knock the sprite back — direction is automatically reversed from
     * the sprite's current facing direction.
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
        const st11 = getState(sprite)
        sprite.vx = st11.facingRight ? -Math.abs(forceX) : Math.abs(forceX)
        sprite.vy = forceY
    }

    /**
     * Knockback toward a source position (e.g. push away from an enemy).
     * @param sprite the player sprite
     * @param sourceX X position of the damage source, eg: 0
     * @param sourceY Y position of the damage source, eg: 0
     * @param force how hard to push, eg: 250
     */
    //% group="Combat"
    //% block="knock $sprite away from x $sourceX y $sourceY with force $force"
    //% sprite.shadow=variables_get
    //% sourceX.defl=0
    //% sourceY.defl=0
    //% force.defl=250
    //% weight=95
    export function knockbackFromPoint(sprite: Sprite, sourceX: number, sourceY: number, force: number): void {
        const dx = sprite.x - sourceX
        const dy = sprite.y - sourceY
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        sprite.vx = (dx / len) * force
        sprite.vy = (dy / len) * force
    }

    /**
     * Launch the sprite upward — useful for bounce pads or stomp bounces.
     * @param sprite the player sprite
     * @param force upward launch speed (positive value, direction auto-applied), eg: 350
     */
    //% group="Combat"
    //% block="launch $sprite upward with force $force"
    //% sprite.shadow=variables_get
    //% force.defl=350
    //% weight=90
    export function launch(sprite: Sprite, force: number): void {
        sprite.vy = -Math.abs(force)
        getState(sprite).jumpsLeft = getState(sprite).maxJumps
    }
}
