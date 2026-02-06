# Deployment Guide: FX Notification Admin on IIS

This guide explains how to deploy the React frontend and .NET Core API to IIS with the API available at `/api`.

## Prerequisites

### Server Requirements
- Windows Server 2016 or later (or Windows 10/11 for development)
- IIS 10 or later
- .NET 8.0 Runtime (Hosting Bundle)
- Node.js 18+ (for building frontend)

### Install Required Components

1. **Install .NET 8.0 Hosting Bundle**
   - Download from: https://dotnet.microsoft.com/download/dotnet/8.0
   - Install the "Hosting Bundle" (includes runtime + IIS module)
   - Restart IIS after installation: `iisreset`

2. **Install IIS Features**
   ```powershell
   # Run in PowerShell as Administrator
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET45
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIExtensions
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIFilter
   Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
   ```

3. **Install URL Rewrite Module**
   - Download from: https://www.iis.net/downloads/microsoft/url-rewrite
   - Required for SPA routing

---

## Step 1: Build the React Frontend

On your development machine or build server:

```bash
cd Frontend/notification-admin

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder with the production build.

---

## Step 2: Publish the .NET Core API

On your development machine or build server:

```bash
cd Backend/AdminApi

# Publish for IIS deployment
dotnet publish -c Release -o ./publish
```

This creates a `publish` folder with the compiled API.

---

## Step 3: Create Folder Structure on Server

Create the following folder structure on your IIS server:

```
C:\inetpub\wwwroot\FXNotificationAdmin\
├── api\                    # .NET Core API
│   ├── AdminApi.dll
│   ├── AdminApi.exe
│   ├── web.config
│   ├── appsettings.json
│   └── ... (other published files)
├── index.html              # React app
├── assets\                 # React assets
│   ├── index-*.js
│   └── index-*.css
└── web.config              # URL rewrite rules for SPA
```

---

## Step 4: Copy Files to Server

1. **Copy React build files:**
   ```powershell
   # Copy contents of Frontend/notification-admin/dist/* to C:\inetpub\wwwroot\FXNotificationAdmin\
   ```

2. **Copy API published files:**
   ```powershell
   # Copy contents of Backend/AdminApi/publish/* to C:\inetpub\wwwroot\FXNotificationAdmin\api\
   ```

---

## Step 5: Configure the API (appsettings.json)

Edit `C:\inetpub\wwwroot\FXNotificationAdmin\api\appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "Default": "Server=YOUR_SQL_SERVER;Database=FXEmail;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  }
}
```

**Important:** Update the connection string with your actual database credentials.

---

## Step 6: Create web.config for React SPA

Create `C:\inetpub\wwwroot\FXNotificationAdmin\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Don't rewrite requests to the API -->
        <rule name="API Requests" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="None" />
        </rule>

        <!-- Don't rewrite requests to static files -->
        <rule name="Static Files" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" />
          </conditions>
          <action type="None" />
        </rule>

        <!-- Rewrite all other requests to index.html for SPA routing -->
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## Step 7: Verify API web.config

Ensure `C:\inetpub\wwwroot\FXNotificationAdmin\api\web.config` exists (created by dotnet publish):

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet" arguments=".\AdminApi.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" hostingModel="inprocess" />
    </system.webServer>
  </location>
</configuration>
```

---

## Step 8: Configure IIS

### Option A: Using IIS Manager (GUI)

1. **Create Application Pool for API:**
   - Open IIS Manager
   - Right-click "Application Pools" → "Add Application Pool"
   - Name: `FXNotificationApiPool`
   - .NET CLR Version: `No Managed Code`
   - Managed Pipeline Mode: `Integrated`
   - Click OK
   - Right-click the new pool → "Advanced Settings"
   - Set "Identity" to a user with database access (or use ApplicationPoolIdentity)

2. **Create Website:**
   - Right-click "Sites" → "Add Website"
   - Site name: `FXNotificationAdmin`
   - Physical path: `C:\inetpub\wwwroot\FXNotificationAdmin`
   - Binding: Choose your port (e.g., 80) or hostname
   - Application Pool: `DefaultAppPool` (or create a new one)
   - Click OK

3. **Add API as Sub-Application:**
   - Expand your new website
   - Right-click the website → "Add Application"
   - Alias: `api`
   - Physical path: `C:\inetpub\wwwroot\FXNotificationAdmin\api`
   - Application Pool: `FXNotificationApiPool`
   - Click OK

### Option B: Using PowerShell

```powershell
Import-Module WebAdministration

# Create Application Pool for API
New-WebAppPool -Name "FXNotificationApiPool"
Set-ItemProperty "IIS:\AppPools\FXNotificationApiPool" -Name "managedRuntimeVersion" -Value ""

# Create Website
New-Website -Name "FXNotificationAdmin" `
    -PhysicalPath "C:\inetpub\wwwroot\FXNotificationAdmin" `
    -Port 80 `
    -ApplicationPool "DefaultAppPool"

# Add API as Sub-Application
New-WebApplication -Site "FXNotificationAdmin" `
    -Name "api" `
    -PhysicalPath "C:\inetpub\wwwroot\FXNotificationAdmin\api" `
    -ApplicationPool "FXNotificationApiPool"
```

---

## Step 9: Set Folder Permissions

Grant IIS access to the folders:

```powershell
# Grant IIS_IUSRS read access to the site
icacls "C:\inetpub\wwwroot\FXNotificationAdmin" /grant "IIS_IUSRS:(OI)(CI)R" /T

# Grant the API app pool identity full access (for logs, etc.)
icacls "C:\inetpub\wwwroot\FXNotificationAdmin\api" /grant "IIS AppPool\FXNotificationApiPool:(OI)(CI)F" /T
```

---

## Step 10: Test the Deployment

1. **Test the React frontend:**
   - Navigate to: `http://your-server/`
   - You should see the FX Notification Admin interface

2. **Test the API:**
   - Navigate to: `http://your-server/api/applications`
   - You should see JSON data (or an empty array)

3. **Test API via Swagger (if enabled in development):**
   - Navigate to: `http://your-server/api/swagger`

---

## Troubleshooting

### Common Issues

1. **502.5 Error - Process Failure**
   - Check if .NET 8.0 Hosting Bundle is installed
   - Run `iisreset` after installing
   - Check Event Viewer for detailed errors

2. **404 Error on API routes**
   - Verify the API is configured as a sub-application (not virtual directory)
   - Check that `web.config` exists in the API folder

3. **SPA routes return 404**
   - Install URL Rewrite Module
   - Verify the root `web.config` has the rewrite rules

4. **Database connection errors**
   - Verify connection string in `appsettings.json`
   - Ensure SQL Server allows the app pool identity or configured user
   - Check firewall rules for SQL Server port (1433)

5. **CORS errors in browser**
   - The API should handle requests from the same origin
   - If using a different domain, update CORS in `Program.cs`

### Enable Logging

To enable stdout logging for debugging:

1. Create logs folder: `C:\inetpub\wwwroot\FXNotificationAdmin\api\logs`

2. Edit `api\web.config`:
   ```xml
   <aspNetCore ... stdoutLogEnabled="true" stdoutLogFile=".\logs\stdout" ... />
   ```

3. Check logs in the `logs` folder after errors occur

---

## HTTPS Configuration (Recommended for Production)

1. **Obtain SSL Certificate:**
   - Use Let's Encrypt, or purchase from a CA
   - Or create a self-signed certificate for testing

2. **Bind HTTPS in IIS:**
   - Select your website
   - Click "Bindings" in the right panel
   - Add → Type: https, Port: 443, SSL Certificate: (select your cert)

3. **Force HTTPS (optional):**
   Add to root `web.config`:
   ```xml
   <rule name="HTTPS Redirect" stopProcessing="true">
     <match url="(.*)" />
     <conditions>
       <add input="{HTTPS}" pattern="off" />
     </conditions>
     <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
   </rule>
   ```

---

## Updating the Application

### Update Frontend Only:
```powershell
# Build locally
cd Frontend/notification-admin
npm run build

# Copy to server (replace existing files)
# Copy dist/* to C:\inetpub\wwwroot\FXNotificationAdmin\
```

### Update API Only:
```powershell
# Publish locally
cd Backend/AdminApi
dotnet publish -c Release -o ./publish

# Stop the app pool
Stop-WebAppPool -Name "FXNotificationApiPool"

# Copy files (excluding appsettings.json to preserve config)
# Copy publish/* to C:\inetpub\wwwroot\FXNotificationAdmin\api\

# Start the app pool
Start-WebAppPool -Name "FXNotificationApiPool"
```

---

## Environment-Specific Configuration

For different environments, create additional appsettings files:

- `appsettings.Production.json` - Production settings
- `appsettings.Staging.json` - Staging settings

Set the environment in IIS:

1. Select the API application
2. Double-click "Configuration Editor"
3. Navigate to `system.webServer/aspNetCore`
4. Add environment variable:
   - Name: `ASPNETCORE_ENVIRONMENT`
   - Value: `Production`

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Secure database connection string (consider Azure Key Vault or Windows DPAPI)
- [ ] Restrict database user permissions to minimum required
- [ ] Enable Windows Authentication if needed
- [ ] Configure firewall rules
- [ ] Remove Swagger in production (or secure it)
- [ ] Set appropriate CORS policies
- [ ] Regular security updates for Windows Server and .NET runtime
