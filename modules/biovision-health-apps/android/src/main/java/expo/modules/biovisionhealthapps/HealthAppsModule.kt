package expo.modules.biovisionhealthapps

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

/** Must stay in step with the <package> entries in this module's AndroidManifest.xml. */
private val KNOWN_FITNESS_PACKAGES = listOf(
  "com.google.android.apps.healthdata",
  "com.google.android.apps.fitness",
  "com.sec.android.app.shealth",
  "com.fitbit.FitbitMobile",
  "com.garmin.android.apps.connectmobile",
  "com.strava",
  "com.huawei.health",
  "com.xiaomi.wearable",
  "com.xiaomi.hm.health",
  "com.huami.watch.hmwatchmanager",
  "com.noisefit",
  "com.myfitnesspal.android",
  "com.healthifyme.basic",
  "com.nike.plusgps",
)

private const val ICON_SIZE_PX = 96

class HealthAppsModule : Module() {
  private val packageManager: PackageManager
    get() = appContext.reactContext?.packageManager ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BioVisionHealthApps")

    /** Installed, launchable health apps: name, package and a small PNG icon as a data URI. */
    AsyncFunction("listInstalled") {
      val ownPackage = appContext.reactContext?.packageName
      val candidates = linkedSetOf<String>()
      candidates += healthConnectClients()
      candidates += KNOWN_FITNESS_PACKAGES
      candidates
        .filter { it != ownPackage }
        .mapNotNull { packageName -> describe(packageName) }
        .sortedBy { (it["name"] as String).lowercase() }
    }

    AsyncFunction("open") { packageName: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return@AsyncFunction false
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }
  }

  /** Apps that declare Health Connect access: the platform's own definition of a health app. */
  private fun healthConnectClients(): List<String> {
    val rationale = Intent("androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE")
    val usage = Intent("android.intent.action.VIEW_PERMISSION_USAGE")
      .addCategory("android.intent.category.HEALTH_PERMISSIONS")
    return (query(rationale) + query(usage)).map { it.activityInfo.packageName }
  }

  private fun query(intent: Intent): List<ResolveInfo> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }

  /** Null when the package is missing or has no launcher entry (nothing for the person to open). */
  private fun describe(packageName: String): Map<String, Any>? {
    if (packageManager.getLaunchIntentForPackage(packageName) == null) return null
    return try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      mapOf(
        "id" to packageName,
        "name" to packageManager.getApplicationLabel(info).toString(),
        "icon" to iconDataUri(packageName),
      )
    } catch (_: PackageManager.NameNotFoundException) {
      null
    }
  }

  private fun iconDataUri(packageName: String): String {
    val drawable = packageManager.getApplicationIcon(packageName)
    val bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX)
    drawable.draw(canvas)
    val bytes = ByteArrayOutputStream().use { stream ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
      stream.toByteArray()
    }
    bitmap.recycle()
    return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
  }
}
