package expo.modules.kioskpin

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android screen pinning. startLockTask() asks the user to confirm pinning
 * (unless the device is managed), then blocks home/recents until stopLockTask().
 */
class KioskPinModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KioskPin")

    Function("start") {
      appContext.currentActivity?.startLockTask()
    }

    Function("stop") {
      try {
        appContext.currentActivity?.stopLockTask()
      } catch (_: Exception) {
        // not pinned
      }
    }
  }
}
