export class UIManager {
  private staminaBar: HTMLElement | null = null;
  private batteryBar: HTMLElement | null = null;
  private sanityBar: HTMLElement | null = null;
  private sanityOverlay: HTMLElement | null = null;
  private enemyIndicator: HTMLElement | null = null;
  private hidingOverlay: HTMLElement | null = null;
  private hidingText: HTMLElement | null = null;
  private hideHint: HTMLElement | null = null;
  private rendijaHint: HTMLElement | null = null;
  private loadingScreen: HTMLElement | null = null;
  private loadingBar: HTMLElement | null = null;
  private loadingStatus: HTMLElement | null = null;
  private messageOverlay: HTMLElement | null = null;
  private scoreElement: HTMLElement | null = null;
  private levelObjective: HTMLElement | null = null;
  private speedBoostIndicator: HTMLElement | null = null;
  private speedBoostTimer: HTMLElement | null = null;
  private invisibilityIndicator: HTMLElement | null = null;
  private invisibilityTimer: HTMLElement | null = null;

  private lastStamina = -1;
  private lastBattery = -1;
  private lastSanity = -1;
  private lastHiding = false;
  private lastCanHide = false;
  private lastSpeedBoost = -1;
  private lastInvisibility = -1;
  private lastEnemyDist = Infinity;
  private lastScore = -1;

  private uiUpdateThrottle = 0;
  private readonly UI_UPDATE_INTERVAL = 100;

  constructor() {
    this.staminaBar = document.getElementById('staminaBar');
    this.batteryBar = document.getElementById('batteryBar');
    this.sanityBar = document.getElementById('sanityBar');
    this.sanityOverlay = document.getElementById('sanityOverlay');
    this.enemyIndicator = document.getElementById('enemyIndicator');
    this.hidingOverlay = document.getElementById('hidingOverlay');
    this.hidingText = document.getElementById('hidingText');
    this.hideHint = document.getElementById('hideHint');
    this.rendijaHint = document.getElementById('rendijaHint');
    this.loadingScreen = document.getElementById('loadingScreen');
    this.loadingBar = document.getElementById('loadingBar');
    this.loadingStatus = document.getElementById('loadingStatus');
    this.messageOverlay = document.getElementById('messageOverlay');
    this.scoreElement = document.getElementById('scoreIndicator');
    this.levelObjective = document.getElementById('levelObjective');
    this.speedBoostIndicator = document.getElementById('speedBoostIndicator');
    this.speedBoostTimer = document.getElementById('speedBoostTimer');
    this.invisibilityIndicator = document.getElementById('invisibilityIndicator');
    this.invisibilityTimer = document.getElementById('invisibilityTimer');
  }

  shouldUpdateUI(delta: number): boolean {
    this.uiUpdateThrottle += delta * 1000;
    if (this.uiUpdateThrottle >= this.UI_UPDATE_INTERVAL) {
      this.uiUpdateThrottle = 0;
      return true;
    }
    return false;
  }

  setLoadingProgress(percent: number, status: string): void {
    if (this.loadingBar) {
      this.loadingBar.style.width = `${percent}%`;
    }
    if (this.loadingStatus) {
      this.loadingStatus.textContent = status;
    }
  }

  updateStamina(stamina: number): void {
    if (this.staminaBar && Math.abs(stamina - this.lastStamina) > 0.5) {
      this.staminaBar.style.width = `${stamina}%`;
      if (stamina < 20) {
        this.staminaBar.classList.add('low');
      } else {
        this.staminaBar.classList.remove('low');
      }
      this.lastStamina = stamina;
    }
  }

  updateBattery(battery: number): void {
    if (this.batteryBar && Math.abs(battery - this.lastBattery) > 0.5) {
      this.batteryBar.style.width = `${battery}%`;
      if (battery < 20) {
        this.batteryBar.classList.add('low');
      } else {
        this.batteryBar.classList.remove('low');
      }
      this.lastBattery = battery;
    }
  }

  updateSanity(sanity: number, maxSanity: number): void {
    if (this.sanityBar && Math.abs(sanity - this.lastSanity) > 1) {
      const pct = (sanity / maxSanity) * 100;
      this.sanityBar.style.width = `${pct}%`;
      if (sanity < 30) {
        this.sanityBar.classList.add('low');
        this.sanityBar.style.background = 'linear-gradient(90deg, #660099, #9933ff)';
      } else if (sanity < 50) {
        this.sanityBar.classList.add('low');
        this.sanityBar.style.background = 'linear-gradient(90deg, #8800cc, #aa44ff)';
      } else {
        this.sanityBar.classList.remove('low');
        this.sanityBar.style.background = 'linear-gradient(90deg, #9933ff, #cc66ff)';
      }
      this.lastSanity = sanity;
    }
    if (this.sanityOverlay) {
      const opacity = Math.max(0, (1 - sanity / maxSanity) * 0.7);
      this.sanityOverlay.style.opacity = String(opacity);
    }
  }

  updateEnemyIndicator(distance: number): void {
    if (this.enemyIndicator && Math.abs(distance - this.lastEnemyDist) > 0.5) {
      if (distance < 5) {
        this.enemyIndicator.textContent = '¡PELIGRO! Enemigo muy cerca';
        this.enemyIndicator.style.color = '#ff0000';
      } else if (distance < 10) {
        this.enemyIndicator.textContent = 'Enemigo detectado cerca';
        this.enemyIndicator.style.color = '#ff8800';
      } else {
        this.enemyIndicator.textContent = '';
      }
      this.lastEnemyDist = distance;
    }
  }

  updateRendijaHint(visible: boolean): void {
    if (this.rendijaHint) {
      this.rendijaHint.style.display = visible ? 'flex' : 'none';
    }
  }

  updateHiding(isHiding: boolean, canHide: boolean): void {
    if (isHiding !== this.lastHiding || canHide !== this.lastCanHide) {
      if (this.hidingOverlay) {
        this.hidingOverlay.style.display = isHiding ? 'block' : 'none';
      }
      if (this.hidingText) {
        this.hidingText.style.display = isHiding ? 'block' : 'none';
      }
      if (this.hideHint) {
        this.hideHint.style.display = (canHide && !isHiding) ? 'block' : 'none';
      }
      this.lastHiding = isHiding;
      this.lastCanHide = canHide;
    }
  }

  showLoading(show: boolean): void {
    if (this.loadingScreen) {
      this.loadingScreen.style.display = show ? 'flex' : 'none';
    }
  }

  showMessage(message: string, duration: number = 2000): void {
    if (this.messageOverlay) {
      this.messageOverlay.textContent = message;
      this.messageOverlay.style.display = 'block';
      setTimeout(() => {
        if (this.messageOverlay) {
          this.messageOverlay.style.display = 'none';
        }
      }, duration);
    }
  }

  getMessageElement(): HTMLElement | null {
    return this.messageOverlay;
  }

  updateScore(score: number, target: number): void {
    if (this.scoreElement && score !== this.lastScore) {
      this.scoreElement.textContent = `PUNTOS: ${score}/${target}`;
      if (score >= target) {
        this.scoreElement.style.color = '#00ff00';
      }
      this.lastScore = score;
    }
  }

  setLevelObjective(html: string): void {
    if (this.levelObjective) {
      this.levelObjective.innerHTML = html;
    }
  }

  updateLevelObjective(html: string): void {
    if (this.levelObjective) {
      this.levelObjective.innerHTML = html;
    }
  }

  updatePowerUps(speedBoostTime: number, invisibilityTime: number): void {
    if (Math.abs(speedBoostTime - this.lastSpeedBoost) > 0.1) {
      if (this.speedBoostIndicator && this.speedBoostTimer) {
        if (speedBoostTime > 0) {
          this.speedBoostIndicator.style.display = 'flex';
          this.speedBoostTimer.textContent = Math.ceil(speedBoostTime).toString();
          this.speedBoostIndicator.classList.add('active');
        } else {
          this.speedBoostIndicator.style.display = 'none';
          this.speedBoostIndicator.classList.remove('active');
        }
      }
      this.lastSpeedBoost = speedBoostTime;
    }
    
    if (Math.abs(invisibilityTime - this.lastInvisibility) > 0.1) {
      if (this.invisibilityIndicator && this.invisibilityTimer) {
        if (invisibilityTime > 0) {
          this.invisibilityIndicator.style.display = 'flex';
          this.invisibilityTimer.textContent = Math.ceil(invisibilityTime).toString();
          this.invisibilityIndicator.classList.add('active');
        } else {
          this.invisibilityIndicator.style.display = 'none';
          this.invisibilityIndicator.classList.remove('active');
        }
      }
      this.lastInvisibility = invisibilityTime;
    }
  }
}
