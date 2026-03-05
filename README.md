# Platformer Extension for MakeCode Arcade

Adds advanced platformer mechanics to your game.

## Features
- ✅ Custom gravity & jump force
- ✅ Double jump (configurable max jumps)
- ✅ Variable-height jumps (hold for higher)
- ✅ Coyote time (grace period at ledge edges)
- ✅ Jump buffering (press early, jump on landing)
- ✅ Wall slide & wall jump
- ✅ Dash with cooldown
- ✅ Knockback
- ✅ Ground/wall/falling/rising detection

## Usage

### Basic Setup
```blocks
let hero = sprites.create(heroImage, SpriteKind.Player)
platformer.setup(hero, 600, -300)
```

### Double Jump
```blocks
platformer.setMaxJumps(hero, 2)
```

### Controls
```blocks
controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    platformer.jump(hero)
})
controller.A.onEvent(ControllerButtonEvent.Released, function () {
    platformer.cutJump(hero, 0.5)
})
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    platformer.dash(hero)
})
```

## License
MIT