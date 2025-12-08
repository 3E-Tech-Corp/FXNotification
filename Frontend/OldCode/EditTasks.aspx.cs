using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using SixLabors.ImageSharp.Formats.Tiff.Compression.Decompressors;
using Telerik.Web.UI;
using YYTools;

public partial class Admin_EditTasks : BasePage
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected void grdApps_SelectedIndexChanged(object sender, EventArgs e)
    {
        grdET.Rebind();
        grdTasks.Rebind();
    }

    protected void grdHistory_ItemCommand(object sender, Telerik.Web.UI.GridCommandEventArgs e)
    {
        if (e.CommandName == "Retry")
        {
            Telerik.Web.UI.GridDataItem di = (Telerik.Web.UI.GridDataItem)e.Item;

            string emailId = di.GetDataKeyValue("ID").ToString();
            DBTool tmp = new DBTool("FXEMail");
            tmp.AddParam("Id", emailId);
            tmp.RunCMD("csp_History_Retry");
            grdOutbox.Rebind();
            grdHistory.Rebind();
        }
    }

    protected void grdHistory_SelectedCellChanged(object sender, EventArgs e)
    {
        grdAudit.Rebind();
    }

    protected string GetSafeTitle(string rawString, int maxLength = 0)
    {
        var text = rawString ?? string.Empty;

        // Truncate if needed
        if (maxLength > 0 && text.Length > maxLength)
        {
            text = text.Substring(0, maxLength) + "...";
        }

        // HTML encode the text
        return HttpUtility.HtmlEncode(text);
    }
}
