import Phaser from 'phaser'
import {
  publishPresence,
  setOfflineOnDisconnect,
  subscribeToPresence,
} from '@/features/presence'
import type { UserPresence } from '@/features/presence'

interface SceneConfig {
  userId: string
  displayName: string
  avatar: string
  onError?: (msg: string) => void
}

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private playerLabel!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
  private currentRoom = ''
  private lastPublish = 0
  private roomZones: Array<{ bounds: Phaser.Geom.Rectangle; id: string }> = []
  private remoteAvatars: Map<
    string,
    { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }
  > = new Map()
  private unsubPresence?: () => void
  private sceneConfig: SceneConfig
  private hasLoadError = false

  constructor(config: SceneConfig) {
    super('OfficeScene')
    this.sceneConfig = config
  }

  preload() {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.hasLoadError = true
      this.sceneConfig.onError?.(
        `No se pudo cargar "${file.key}". Verifica que los assets estén en public/assets/`
      )
    })

    this.load.tilemapTiledJSON('office', '/assets/tilemaps/office.json')
    this.load.image('tiles', '/assets/tilesets/office_tileset.png')
    this.load.spritesheet('characters', '/assets/sprites/characters.png', {
      frameWidth: 16,
      frameHeight: 16,
    })
  }

  create() {
    if (this.hasLoadError) return

    const map = this.make.tilemap({ key: 'office' })
    const tileset = map.addTilesetImage('office_tileset', 'tiles')!
    map.createLayer('Floor', tileset)
    const wallsLayer = map.createLayer('Walls', tileset)!
    // Colisión solo en tiles de pared (IDs 3-5). Puertas (7) y otros son pasables.
    wallsLayer.setCollisionBetween(3, 5)

    // Room zones + spawn point from Tiled object layer
    const objectLayer = map.getObjectLayer('Rooms')
    let spawnX = map.widthInPixels / 2
    let spawnY = map.heightInPixels / 2

    if (objectLayer) {
      objectLayer.objects.forEach((obj) => {
        if (obj.name === 'spawn') {
          spawnX = obj.x! + (obj.width ?? 0) / 2
          spawnY = obj.y! + (obj.height ?? 0) / 2
        } else {
          this.roomZones.push({
            id: obj.name ?? '',
            bounds: new Phaser.Geom.Rectangle(obj.x!, obj.y!, obj.width!, obj.height!),
          })
        }
      })
    }

    this.player = this.physics.add.sprite(spawnX, spawnY, 'characters', 0)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, wallsLayer)

    // Label flotante sobre el jugador local
    this.playerLabel = this.add.text(spawnX, spawnY - 14, this.sceneConfig.displayName, {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#00000099',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey('W'),
      down: this.input.keyboard!.addKey('S'),
      left: this.input.keyboard!.addKey('A'),
      right: this.input.keyboard!.addKey('D'),
    }

    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('characters', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('characters', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('characters', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('characters', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1,
    })

    // En modo demo (userId vacío) se omite la sincronización con RTDB
    if (this.sceneConfig.userId) {
      setOfflineOnDisconnect(this.sceneConfig.userId)
      this.unsubPresence = subscribeToPresence((presence) => {
        this.syncRemoteAvatars(presence)
      })
    }
  }

  update(time: number) {
    if (this.hasLoadError) return

    const speed = 80
    const { left, right, up, down } = this.wasd
    const c = this.cursors

    this.player.setVelocity(0)

    if (c.left.isDown || left.isDown) {
      this.player.setVelocityX(-speed)
      this.player.anims.play('walk-left', true)
    } else if (c.right.isDown || right.isDown) {
      this.player.setVelocityX(speed)
      this.player.anims.play('walk-right', true)
    } else if (c.up.isDown || up.isDown) {
      this.player.setVelocityY(-speed)
      this.player.anims.play('walk-up', true)
    } else if (c.down.isDown || down.isDown) {
      this.player.setVelocityY(speed)
      this.player.anims.play('walk-down', true)
    } else {
      this.player.anims.stop()
    }

    // Label sigue al jugador local
    this.playerLabel.setPosition(this.player.x, this.player.y - 14)

    this.currentRoom = this.detectRoom()

    // ponytail: throttle 150ms — evita publicar cada frame (~60fps → ~6fps efectivos)
    if (time - this.lastPublish > 150) {
      this.lastPublish = time
      publishPresence(this.sceneConfig.userId, {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        room: this.currentRoom,
        displayName: this.sceneConfig.displayName,
        avatar: this.sceneConfig.avatar,
        online: true,
      })
    }
  }

  private detectRoom(): string {
    const px = this.player.x
    const py = this.player.y
    for (const zone of this.roomZones) {
      if (zone.bounds.contains(px, py)) return zone.id
    }
    return ''
  }

  private syncRemoteAvatars(presence: Record<string, UserPresence>) {
    const { userId } = this.sceneConfig

    for (const [uid, { sprite, label }] of this.remoteAvatars) {
      if (!presence[uid] || !presence[uid].online) {
        sprite.destroy()
        label.destroy()
        this.remoteAvatars.delete(uid)
      }
    }

    for (const [uid, data] of Object.entries(presence)) {
      if (uid === userId || !data.online) continue

      if (this.remoteAvatars.has(uid)) {
        const { sprite, label } = this.remoteAvatars.get(uid)!
        sprite.setPosition(data.x, data.y)
        label.setPosition(data.x, data.y - 14)
      } else {
        const sprite = this.add.sprite(data.x, data.y, 'characters', 1)
        const label = this.add.text(data.x, data.y - 14, data.displayName, {
          fontSize: '8px',
          color: '#ffffff',
          backgroundColor: '#00000099',
          padding: { x: 2, y: 1 },
        }).setOrigin(0.5)
        this.remoteAvatars.set(uid, { sprite, label })
      }
    }
  }

  shutdown() {
    this.unsubPresence?.()
  }
}
