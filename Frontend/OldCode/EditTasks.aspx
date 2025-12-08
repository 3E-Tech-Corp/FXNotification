<%@ Page Title="" Language="C#" MasterPageFile="~/Masterpages/Member.Master" AutoEventWireup="true"
    CodeFile="EditTasks.aspx.cs" Inherits="Admin_EditTasks" ValidateRequest="false" %>

<asp:Content ID="Content1" ContentPlaceHolderID="Head" runat="Server">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="Content" runat="Server">
    <telerik:RadAjaxManagerProxy ID="RadAjaxManager1" runat="server">
        <AjaxSettings>
        </AjaxSettings>
    </telerik:RadAjaxManagerProxy>
    <div class="Page_Title">
        Edit FX Email Worker Templates
    </div>
    <a href="NagSettings.aspx">Configure Nag Settings</a>
    <telerik:RadTabStrip ID="RadTabStrip1" runat="server" MultiPageID="RadMultiPage1"
        Orientation="HorizontalTop" SelectedIndex="0">
        <Tabs>
            <telerik:RadTab Text="Profiles" Value="Profiles" PageViewID="Profiles" runat="server">
            </telerik:RadTab>
            <telerik:RadTab Text="Applications" Value="Apps" PageViewID="Apps" runat="server">
            </telerik:RadTab>
            <telerik:RadTab Text="Templates" Value="Templates" PageViewID="Templates" runat="server">
            </telerik:RadTab>
            <telerik:RadTab Text="Tasks" Value="Tasks" PageViewID="Tasks" runat="server">
            </telerik:RadTab>
            <telerik:RadTab Text="OutBox" Value="OutBox" PageViewID="OutBox" runat="server">
            </telerik:RadTab>
            <telerik:RadTab Text="Sent" Value="Sent" PageViewID="Sent" runat="server">
            </telerik:RadTab>
        </Tabs>
    </telerik:RadTabStrip>
    <div id="InputArea">
        <telerik:RadMultiPage ID="RadMultiPage1" SelectedIndex="0" runat="server" Width="100%"
            Height="100%">

            <telerik:RadPageView ID="Profiles" runat="server">

                <telerik:RadGrid ID="grdProfiles" runat="server"
                    DataSourceID="sdsProfiles" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True"
                    ShowStatusBar="true"
                    AllowAutomaticUpdates="true"
                    AllowAutomaticInserts="true">
                    <MasterTableView DataKeyNames="ProfileId" EditMode="EditForms" CommandItemDisplay="Top">
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <Columns>
                            <telerik:GridEditCommandColumn>
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridEditCommandColumn>

                            <telerik:GridBoundColumn DataField="ProfileId" HeaderAbbr="ID" HeaderText="ID"
                                UniqueName="ProfileId" ReadOnly="true">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="ProfileCode" HeaderAbbr="ProfileCode" HeaderText="ProfileCode"
                                UniqueName="ProfileCode">
                                <ItemStyle Width="150px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="FromName" HeaderAbbr="FromName" HeaderText="FromName"
                                UniqueName="FromName">
                            </telerik:GridBoundColumn>

                            <telerik:GridBoundColumn DataField="FromEmail" HeaderAbbr="FromEmail" HeaderText="FromEmail"
                                UniqueName="FromEmail">
                            </telerik:GridBoundColumn>

                            <telerik:GridBoundColumn DataField="SmtpHost" HeaderAbbr="SmtpHost" HeaderText="SmtpHost"
                                UniqueName="SmtpHost">
                            </telerik:GridBoundColumn>

                            <telerik:GridNumericColumn DataField="SmtpPort" HeaderAbbr="SmtpPort" HeaderText="SmtpPort"
                                UniqueName="SmtpPort" DecimalDigits="0">
                            </telerik:GridNumericColumn>

                            <telerik:GridBoundColumn DataField="AuthUser" HeaderAbbr="AuthUser" HeaderText="AuthUser"
                                UniqueName="AuthUser">
                            </telerik:GridBoundColumn>

                            <telerik:GridBoundColumn DataField="AuthSecretRef" HeaderAbbr="AuthSecretRef" HeaderText="AuthSecretRef"
                                UniqueName="AuthSecretRef">
                            </telerik:GridBoundColumn>


                            <telerik:GridDropDownColumn DataSourceID="sdsSecurityModes"
                                DataField="SecurityMode"
                                HeaderText="SecurityMode" HeaderAbbr="ProfileID"
                                UniqueName="SecurityMode"
                                ListTextField="Text" ListValueField="Value">
                            </telerik:GridDropDownColumn>

                            <telerik:GridDropDownColumn DataSourceID="sdsYesNoBool"
                                DataField="IsActive"
                                HeaderText="IsActive" HeaderAbbr="IsActive"
                                UniqueName="IsActive"
                                ListTextField="Text" ListValueField="Value">
                            </telerik:GridDropDownColumn>
                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false" EnableRowHoverStyle="true" EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>

                <asp:SqlDataSource ID="sdsSecurityModes" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_SecurityMode_Get" SelectCommandType="StoredProcedure"></asp:SqlDataSource>
                <asp:SqlDataSource ID="sdsYesNoBool" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_YesNo_Bool" SelectCommandType="StoredProcedure"></asp:SqlDataSource>

                <asp:SqlDataSource ID="sdsProfiles" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Profiles_Get" SelectCommandType="StoredProcedure"
                    InsertCommand="csp_MailProfile_AddNew"
                    InsertCommandType="StoredProcedure"
                    UpdateCommand="csp_MailProfile_Update"
                    UpdateCommandType="StoredProcedure">

                    <InsertParameters>
                        <asp:Parameter Name="ProfileId" Type="Int32" Direction="ReturnValue" />
                        <asp:Parameter Name="ProfileCode" Type="String" />
                        <asp:ControlParameter Name="App_ID" Type="Int32"
                            ControlID="grdApps" PropertyName="SelectedValue" />
                        <asp:Parameter Name="FromName" Type="String" />
                        <asp:Parameter Name="FromEmail" Type="String" />
                        <asp:Parameter Name="SmtpHost" Type="String" />
                        <asp:Parameter Name="SmtpPort" Type="Int32" />
                        <asp:Parameter Name="AuthUser" Type="String" />
                        <asp:Parameter Name="AuthSecretRef" Type="String" />
                        <asp:Parameter Name="SecurityMode" Type="String" />
                        <asp:Parameter Name="IsActive" Type="Boolean" />
                    </InsertParameters>
                    <UpdateParameters>
                        <asp:Parameter Name="ProfileId" Type="Int32" />
                        <asp:Parameter Name="ProfileCode" Type="String" />
                        <asp:Parameter Name="App_ID" Type="Int32" />
                        <asp:Parameter Name="FromName" Type="String" />
                        <asp:Parameter Name="FromEmail" Type="String" />
                        <asp:Parameter Name="SmtpHost" Type="String" />
                        <asp:Parameter Name="SmtpPort" Type="Int32" />
                        <asp:Parameter Name="AuthUser" Type="String" />
                        <asp:Parameter Name="AuthSecretRef" Type="String" />
                        <asp:Parameter Name="SecurityMode" Type="String" />
                        <asp:Parameter Name="IsActive" Type="Boolean" />
                    </UpdateParameters>
                </asp:SqlDataSource>
            </telerik:RadPageView>

            <telerik:RadPageView ID="Apps" runat="server">


                <telerik:RadGrid ID="grdApps" runat="server" DataSourceID="sdsApps" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True" ShowStatusBar="true"
                    AllowAutomaticUpdates="true" AllowAutomaticInserts="true"
                    OnSelectedIndexChanged="grdApps_SelectedIndexChanged">
                    <MasterTableView DataKeyNames="App_ID" EditMode="EditForms" CommandItemDisplay="Top">
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <Columns>
                            <telerik:GridEditCommandColumn>
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridEditCommandColumn>

                            <telerik:GridBoundColumn DataField="App_ID" HeaderAbbr="ID" HeaderText="ID"
                                UniqueName="App_ID" ReadOnly="true">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>

                            <telerik:GridBoundColumn DataField="App_Code" HeaderAbbr="App_Code" HeaderText="App_Code"
                                UniqueName="App_Code">
                                <ItemStyle Width="150px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="Descr" HeaderAbbr="Descr" HeaderText="Descr"
                                UniqueName="Descr">
                            </telerik:GridBoundColumn>

                            <telerik:GridDropDownColumn DataField="ProfileID" HeaderText="ProfileID" HeaderAbbr="ProfileID"
                                UniqueName="ProfileID" DataSourceID="sdsProfiles"
                                ListTextField="ProfileCode" ListValueField="ProfileID">
                            </telerik:GridDropDownColumn>
                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false" EnableRowHoverStyle="true" EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>

                <asp:SqlDataSource ID="sdsApps" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Get_Apps" SelectCommandType="StoredProcedure"
                    InsertCommand="csp_Apps_Add"
                    InsertCommandType="StoredProcedure"
                    UpdateCommand="csp_Apps_Update"
                    UpdateCommandType="StoredProcedure">
                    <InsertParameters>
                        <asp:Parameter Name="App_ID" Type="Int32" Direction="ReturnValue" />
                        <asp:Parameter Name="App_Code" Type="String" />
                        <asp:Parameter Name="Descr" Type="String" />
                        <asp:Parameter Name="ProfileID" Type="Int32" />
                    </InsertParameters>
                    <UpdateParameters>
                        <asp:Parameter Name="App_ID" Type="Int32" />
                        <asp:Parameter Name="App_Code" Type="String" />
                        <asp:Parameter Name="Descr" Type="String" />
                        <asp:Parameter Name="ProfileID" Type="Int32" />
                    </UpdateParameters>
                </asp:SqlDataSource>
            </telerik:RadPageView>

            <telerik:RadPageView ID="Templates" runat="server">


                <telerik:RadGrid ID="grdET" runat="server" DataSourceID="sdsET" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True" ShowStatusBar="true"
                    AllowAutomaticUpdates="true" AllowAutomaticInserts="true">
                    <MasterTableView DataKeyNames="ET_ID" EditMode="PopUp" CommandItemDisplay="Top">
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <EditFormSettings EditFormType="Template" PopUpSettings-Height="560px" PopUpSettings-Width="900px">
                            <FormTemplate>
                                <table border="0" align="center">
                                    <tr>
                                        <td>Code:
                                        </td>
                                        <td>
                                            <asp:TextBox ID="TextBox1" Width="250px" runat="server" Text='<%# Bind("ET_Code") %>'>
                                            </asp:TextBox>
                                            (Be careful changing this field)
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Subject:
                                        </td>
                                        <td>
                                            <asp:TextBox ID="txtLU_Code" Width="400px" runat="server" Text='<%# Bind("Subject") %>'>
                                            </asp:TextBox>
                                            &nbsp;&nbsp;&nbsp;&nbsp;<asp:Button ID="btnUpdate" Text='<%# (Container is GridEditFormInsertItem) ? "Insert" : "Update" %>'
                                                runat="server" CommandName='<%# (Container is GridEditFormInsertItem) ? "PerformInsert" : "Update" %>'></asp:Button>
                                            &nbsp;&nbsp;&nbsp;
                                    <asp:Button ID="btnCancel" Text="Cancel" runat="server" CausesValidation="False"
                                        CommandName="Cancel"></asp:Button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td valign="top">Email Body:
                                        </td>
                                        <td width="800" height="200">
                                            <telerik:RadEditor ID="RadEditor1" runat="server" Width="100%"
                                                ToolsFile="/admin/ReTools.xml"
                                                Content='<%# Bind("Body") %>' ToolsWidth="790">
                                                <Tools>
                                                    <telerik:EditorToolGroup>
                                                        <telerik:EditorTool Name="Cut" />
                                                        <telerik:EditorTool Name="Copy" />
                                                        <telerik:EditorTool Name="Paste" />
                                                    </telerik:EditorToolGroup>
                                                </Tools>
                                                <Modules>
                                                    <telerik:EditorModule Name="RadEditorStatistics" />
                                                </Modules>
                                            </telerik:RadEditor>
                                        </td>
                                    </tr>

                                </table>
                            </FormTemplate>
                            <PopUpSettings Modal="false" />
                        </EditFormSettings>
                        <Columns>
                            <telerik:GridEditCommandColumn>
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridEditCommandColumn>

                            <telerik:GridBoundColumn DataField="ET_ID" HeaderAbbr="ID" HeaderText="ID"
                                UniqueName="ET_ID" ReadOnly="true">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="ET_Code" HeaderAbbr="ET_Code" HeaderText="ET_Code"
                                UniqueName="ET_Code">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="Subject" HeaderAbbr="Subject" HeaderText="Subject"
                                UniqueName="Subject">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="Body" HeaderAbbr="Body" HeaderText="Body"
                                UniqueName="Body">
                            </telerik:GridBoundColumn>
                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false" EnableRowHoverStyle="true" EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>

                <asp:SqlDataSource ID="sdsET" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Get_Email_Templates"
                    SelectCommandType="StoredProcedure"
                    InsertCommand="csp_Email_Templates_AddNew"
                    InsertCommandType="StoredProcedure"
                    UpdateCommand="csp_Email_Templates_Update"
                    UpdateCommandType="StoredProcedure">
                    <SelectParameters>
                        <asp:ControlParameter Name="App_ID" Type="Int32"
                            ControlID="grdApps" PropertyName="SelectedValue"
                            DefaultValue="0" />
                    </SelectParameters>
                    <InsertParameters>
                        <asp:Parameter Name="ET_ID" Type="Int32" Direction="ReturnValue" />
                        <asp:Parameter Name="ET_Code" Type="String" />
                        <asp:Parameter Name="Subject" Type="String" />
                        <asp:Parameter Name="Body" Type="String" />
                    </InsertParameters>
                    <UpdateParameters>
                        <asp:Parameter Name="ET_ID" Type="Int32" />
                        <asp:Parameter Name="ET_Code" Type="String" />
                        <asp:Parameter Name="Subject" Type="String" />
                        <asp:Parameter Name="Body" Type="String" />
                    </UpdateParameters>
                </asp:SqlDataSource>
            </telerik:RadPageView>

            <telerik:RadPageView ID="Tasks" runat="server">

                <telerik:RadGrid ID="grdTasks" runat="server"
                    DataSourceID="sdsTasks" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True"
                    ShowStatusBar="true"
                    AllowAutomaticUpdates="true"
                    AllowAutomaticInserts="true">
                    <MasterTableView DataKeyNames="Task_ID"
                        EditMode="EditForms" CommandItemDisplay="Top">
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>

                        <Columns>
                            <telerik:GridEditCommandColumn>
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridEditCommandColumn>

                            <telerik:GridBoundColumn DataField="Task_ID" HeaderAbbr="ID" HeaderText="ID"
                                UniqueName="Task_ID" ReadOnly="true">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="TaskCode" HeaderAbbr="ET_Code" HeaderText="ET_Code"
                                UniqueName="TaskCode">
                                <ItemStyle Width="100px" />
                            </telerik:GridBoundColumn>

                            <telerik:GridDropDownColumn DataField="Status"
                                HeaderText="Status" HeaderAbbr="Status"
                                UniqueName="Status" DataSourceID="sdsTaskStatus"
                                ListTextField="Text" ListValueField="Value">
                            </telerik:GridDropDownColumn>
                            <telerik:GridDropDownColumn DataField="TaskType"
                                HeaderText="TaskType" HeaderAbbr="Status"
                                UniqueName="TaskType" DataSourceID="sdsTaskType"
                                ListTextField="Text" ListValueField="Value">
                            </telerik:GridDropDownColumn>

                            <telerik:GridDropDownColumn DataField="MailPriority"
                                HeaderText="MailPriority" HeaderAbbr="MailPriority"
                                UniqueName="MailPriority" DataSourceID="sdsTaskPriority"
                                ListTextField="Text" ListValueField="Value">
                            </telerik:GridDropDownColumn>

                            <telerik:GridBoundColumn DataField="TestMailTo" HeaderAbbr="TestMailTo" HeaderText="TestMailTo"
                                UniqueName="TestMailTo">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="LangCode" HeaderAbbr="LangCode" HeaderText="LangCode"
                                UniqueName="LangCode">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="MailFromName"
                                HeaderAbbr="MailFromName" HeaderText="MailFromName" UniqueName="MailFromName">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="MailFrom" HeaderAbbr="MailFrom" HeaderText="MailFrom"
                                UniqueName="MailFrom">
                            </telerik:GridBoundColumn>


                            <telerik:GridDropDownColumn DataField="ProfileID" HeaderText="ProfileID" HeaderAbbr="ProfileID"
                                UniqueName="ProfileID" DataSourceID="sdsProfiles"
                                ListTextField="ProfileCode" ListValueField="ProfileID">
                            </telerik:GridDropDownColumn>

                            <telerik:GridDropDownColumn DataField="TemplateID" HeaderText="TemplateID" HeaderAbbr="TemplateID"
                                UniqueName="TemplateID" DataSourceID="sdsET"
                                ListTextField="Et_Code" ListValueField="ET_ID">
                            </telerik:GridDropDownColumn>

                            <telerik:GridBoundColumn DataField="MailTo" HeaderAbbr="MailTo" HeaderText="MailTo"
                                UniqueName="MailTo">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="MailCC" HeaderAbbr="MailCC" HeaderText="MailCC"
                                UniqueName="MailCC">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="MailBCC" HeaderAbbr="MailBCC" HeaderText="MailBCC"
                                UniqueName="MailBCC">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="AttachmentProcName" HeaderAbbr="AttachmentProcName" HeaderText="AttachmentProcName"
                                UniqueName="AttachmentProcName">
                            </telerik:GridBoundColumn>

                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false" EnableRowHoverStyle="true" EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>
                <asp:SqlDataSource ID="sdsTaskStatus" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Task_Status" SelectCommandType="StoredProcedure"></asp:SqlDataSource>

                <asp:SqlDataSource ID="sdsTaskType" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Task_Type" SelectCommandType="StoredProcedure"></asp:SqlDataSource>
                <asp:SqlDataSource ID="sdsTaskPriority" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Task_Priority" SelectCommandType="StoredProcedure"></asp:SqlDataSource>

                <asp:SqlDataSource ID="sdsTasks" runat="server" ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Tasks_Get"
                    SelectCommandType="StoredProcedure"
                    InsertCommand="csp_Tasks_AddNEw"
                    InsertCommandType="StoredProcedure"
                    UpdateCommand="csp_Tasks_Update"
                    UpdateCommandType="StoredProcedure">
                    <SelectParameters>
                        <asp:ControlParameter Name="App_ID" Type="Int32"
                            ControlID="grdApps" PropertyName="SelectedValue"
                            DefaultValue="0" />
                    </SelectParameters>
                    <InsertParameters>
                        <asp:Parameter Name="Task_ID" Type="Int32" Direction="ReturnValue" />
                        <asp:Parameter Name="TaskCode" Type="String" />
                        <asp:Parameter Name="TaskType" Type="String" />
                        <asp:ControlParameter Name="App_ID" Type="Int32"
                            ControlID="grdApps" PropertyName="SelectedValue"
                            DefaultValue="0" />
                        <asp:Parameter Name="ProfileID" Type="Int32" />
                        <asp:Parameter Name="TemplateID" Type="Int32" />
                        <asp:Parameter Name="Status" Type="String" />
                        <asp:Parameter Name="TestMailTo" Type="String" />
                        <asp:Parameter Name="LangCode" Type="String" />
                        <asp:Parameter Name="MailFromName" Type="String" />
                        <asp:Parameter Name="MailFrom" Type="String" />
                        <asp:Parameter Name="MailTo" Type="String" />
                        <asp:Parameter Name="MailCC" Type="String" />
                        <asp:Parameter Name="MailBCC" Type="String" />
                        <asp:Parameter Name="AttachmentProcName" Type="String" />
                    </InsertParameters>
                    <UpdateParameters>
                        <asp:Parameter Name="Task_ID" Type="Int32" />
                        <asp:Parameter Name="TaskCode" Type="String" />
                        <asp:Parameter Name="TaskType" Type="String" />
                        <asp:ControlParameter Name="App_ID" Type="Int32"
                            ControlID="grdApps" PropertyName="SelectedValue"
                            DefaultValue="0" />
                        <asp:Parameter Name="ProfileID" Type="Int32" />
                        <asp:Parameter Name="TemplateID" Type="Int32" />
                        <asp:Parameter Name="Status" Type="String" />
                        <asp:Parameter Name="TestMailTo" Type="String" />
                        <asp:Parameter Name="LangCode" Type="String" />
                        <asp:Parameter Name="MailFromName" Type="String" />
                        <asp:Parameter Name="MailFrom" Type="String" />
                        <asp:Parameter Name="MailTo" Type="String" />
                        <asp:Parameter Name="MailCC" Type="String" />
                        <asp:Parameter Name="MailBCC" Type="String" />
                        <asp:Parameter Name="AttachmentProcName" Type="String" />
                    </UpdateParameters>
                </asp:SqlDataSource>
            </telerik:RadPageView>

            <telerik:RadPageView ID="OutBox" runat="server">


                <telerik:RadGrid ID="grdOutbox" runat="server"
                    DataSourceID="sdsOutbox" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True"
                    ShowStatusBar="true" OnItemCommand="grdHistory_ItemCommand"
                    AllowAutomaticUpdates="true" AllowAutomaticDeletes="true">
                    <MasterTableView DataKeyNames="ID" CommandItemDisplay="Top" EditMode="EditForms">
                        <CommandItemSettings ShowAddNewRecordButton="false" />
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <Columns>
                            <telerik:GridTemplateColumn HeaderText="" UniqueName="RetryColumn">

                                <ItemStyle Width="40px" HorizontalAlign="center" />
                                <ItemTemplate>

                                    <asp:LinkButton ID="lnkRetry" runat="server"
                                        CommandName="Retry">
         <i class="fa fa-2x fa-redo blue" title="Retry ID #<%# Eval ("ID") %>"></i>
                                    </asp:LinkButton>
                                </ItemTemplate>
                            </telerik:GridTemplateColumn>
                            <telerik:GridEditCommandColumn ButtonType="ImageButton">
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridEditCommandColumn>
                            <telerik:GridButtonColumn CommandName="Delete" Text="Delete" HeaderText="Delete"
                                UniqueName="DeleteColumn" ButtonType="ImageButton" ConfirmText="Delete this outbox item?">
                                <ItemStyle Width="40px" HorizontalAlign="center" />
                            </telerik:GridButtonColumn>
                            <telerik:GridDateTimeColumn DataField="CreatedAt" HeaderAbbr="CreatedAt" HeaderText="CreatedAt"
                                UniqueName="CreatedAt" ReadOnly="true">
                            </telerik:GridDateTimeColumn>

                            <telerik:GridDropDownColumn DataField="taskID" HeaderText="Task" HeaderAbbr="task"
                                UniqueName="taskID" DataSourceID="sdsTasks"
                                ListTextField="TaskCode" ListValueField="Task_ID">
                            </telerik:GridDropDownColumn>
                            <telerik:GridBoundColumn DataField="ToList" HeaderAbbr="ToList" HeaderText="ToList"
                                UniqueName="ToList">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="CcList" HeaderAbbr="CcList" HeaderText="CcList"
                                UniqueName="CcList" ReadOnly="true">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="BccList" HeaderAbbr="BccList" HeaderText="BccList"
                                UniqueName="BccList" ReadOnly="true">
                            </telerik:GridBoundColumn>
                            <telerik:GridNumericColumn DataField="Attempts" HeaderAbbr="Attempts" HeaderText="Attempts"
                                UniqueName="Attempts" ReadOnly="true">
                            </telerik:GridNumericColumn>
                            <telerik:GridBoundColumn DataField="LastError" HeaderAbbr="LastError" HeaderText="LastError"
                                UniqueName="LastError" ReadOnly="true">
                            </telerik:GridBoundColumn>


                            <telerik:GridTemplateColumn HeaderText="BodyJson" UniqueName="BodyJson">
                                <ItemTemplate>
                                    <span title="<%#  GetSafeTitle (Eval ("BodyJson").ToString() ) %>">
                                        <%# GetSafeTitle (Eval ("BodyJson").ToString(),30 ) %></span>
                                </ItemTemplate>
                                <EditItemTemplate>
                                    <telerik:RadTextBox Rows="5" Columns ="100" TextMode ="MultiLine" runat="server" ID="txtBodyJson" Text='<%# Bind ("BodyJson") %>'>
                                    </telerik:RadTextBox>
                                </EditItemTemplate>
                            </telerik:GridTemplateColumn>

                            <telerik:GridTemplateColumn HeaderText="DetailJson" UniqueName="DetailJson">
                                <ItemTemplate>
                                    <span title="<%#  GetSafeTitle (Eval ("DetailJson").ToString() ) %>">
                                        <%# GetSafeTitle (Eval ("DetailJson").ToString(),30 ) %></span>
                                </ItemTemplate>
                                <EditItemTemplate>
                                    <telerik:RadTextBox Rows="5" Columns ="100" TextMode ="MultiLine" 
                                            runat="server" ID="txtDetailJson" Text='<%# Bind ("DetailJson") %>'>
                                    </telerik:RadTextBox>
                                </EditItemTemplate>
                            </telerik:GridTemplateColumn>

                            <telerik:GridDropDownColumn DataField="Status" HeaderText="Status" HeaderAbbr="Status"
                                UniqueName="Status" DataSourceID="sdsOutboxStatus"
                                ListTextField="text" ListValueField="value" ReadOnly ="true">
                            </telerik:GridDropDownColumn>
                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false" EnableRowHoverStyle="true" EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>
                <asp:SqlDataSource ID="sdsOutboxStatus" runat="server"
                    ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Outbox_Status" SelectCommandType="StoredProcedure"></asp:SqlDataSource>

                <asp:SqlDataSource ID="sdsOutbox" runat="server"
                    ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_Outbox_Get" SelectCommandType="StoredProcedure"
                    UpdateCommand="csp_Outbox_Update" UpdateCommandType="StoredProcedure"
                    DeleteCommand="csp_Outbox_Delete" DeleteCommandType="StoredProcedure">
                    <DeleteParameters>
                        <asp:Parameter Name="ID" Type="Int32" />
                    </DeleteParameters>
                    <UpdateParameters>
                        <asp:Parameter Name="ID" Type="Int32" />
                        <asp:Parameter Name="TaskID" Type="String" />
                        <asp:Parameter Name="ToList" Type="String" />
                        <asp:Parameter Name="BodyJson" Type="String" />
                        <asp:Parameter Name="DetailJson" Type="String" />
                    </UpdateParameters>
                </asp:SqlDataSource>

            </telerik:RadPageView>

            <telerik:RadPageView ID="Sent" runat="server">


                <telerik:RadGrid ID="grdHistory" runat="server"
                    DataSourceID="sdsHistory" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True" AllowSorting="True"
                    ShowStatusBar="true" OnItemCommand="grdHistory_ItemCommand"
                    AllowAutomaticUpdates="true" OnSelectedCellChanged="grdHistory_SelectedCellChanged">
                    <MasterTableView DataKeyNames="ID" CommandItemDisplay="Top">
                        <CommandItemSettings ShowAddNewRecordButton="false" />
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <Columns>
                            <telerik:GridTemplateColumn HeaderText="Retry" UniqueName="RetryColumn">

                                <ItemStyle Width="40px" HorizontalAlign="center" />
                                <ItemTemplate>

                                    <asp:LinkButton ID="lnkRetry" runat="server"
                                        CommandName="Retry"
                                        OnClientClick="event.stopPropagation(); return true;">
                        <i class="fa fa-2x fa-redo blue" title="Retry ID #<%# Eval ("ID") %>"></i>
                                    </asp:LinkButton>
                                </ItemTemplate>
                            </telerik:GridTemplateColumn>
                            <telerik:GridDateTimeColumn DataField="CreatedAt" HeaderAbbr="CreatedAt" HeaderText="CreatedAt"
                                UniqueName="CreatedAt">
                            </telerik:GridDateTimeColumn>
                            <telerik:GridBoundColumn DataField="taskcode" HeaderAbbr="taskcode" HeaderText="taskcode"
                                UniqueName="taskcode">
                                <ItemStyle Width="150px" />
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="ToList" HeaderAbbr="ToList" HeaderText="ToList"
                                UniqueName="ToList">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="CcList" HeaderAbbr="CcList" HeaderText="CcList"
                                UniqueName="CcList">
                            </telerik:GridBoundColumn>
                            <telerik:GridBoundColumn DataField="BccList" HeaderAbbr="BccList" HeaderText="BccList"
                                UniqueName="BccList">
                            </telerik:GridBoundColumn>
                            <telerik:GridNumericColumn DataField="Attempts" HeaderAbbr="Attempts" HeaderText="Attempts"
                                UniqueName="Attempts">
                            </telerik:GridNumericColumn>
                            <telerik:GridBoundColumn DataField="LastError" HeaderAbbr="LastError" HeaderText="LastError"
                                UniqueName="LastError">
                            </telerik:GridBoundColumn>


                            <telerik:GridTemplateColumn HeaderText="BodyJson" UniqueName="BodyJson">
                                <ItemTemplate>
                                    <span title="<%#  GetSafeTitle (Eval ("BodyJson").ToString() ) %>">
                                        <%# GetSafeTitle (Eval ("BodyJson").ToString(),30 ) %></span>
                                </ItemTemplate>
                            </telerik:GridTemplateColumn>

                            <telerik:GridTemplateColumn HeaderText="DetailJson" UniqueName="DetailJson">
                                <ItemTemplate>
                                    <span title="<%#  GetSafeTitle (Eval ("DetailJson").ToString() ) %>">
                                        <%# GetSafeTitle (Eval ("DetailJson").ToString(),30 ) %></span>
                                </ItemTemplate>
                            </telerik:GridTemplateColumn>

                            <telerik:GridDropDownColumn DataField="Status" HeaderText="Status" HeaderAbbr="Status"
                                UniqueName="Status" DataSourceID="sdsOutboxStatus"
                                ListTextField="text" ListValueField="value">
                            </telerik:GridDropDownColumn>
                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false"
                        EnableRowHoverStyle="true"
                        EnablePostBackOnRowClick="true"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="false"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>
                <asp:SqlDataSource ID="sdsHistory" runat="server"
                    ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_History_Get" SelectCommandType="StoredProcedure"></asp:SqlDataSource>

                <hr />
                <telerik:RadGrid ID="grdAudit" runat="server"
                    DataSourceID="sdsAudit" AutoGenerateColumns="false"
                    GridLines="None" AllowPaging="True">
                    <MasterTableView DataKeyNames="Audit_ID" CommandItemDisplay="Top">
                        <CommandItemSettings ShowAddNewRecordButton="false" />
                        <RowIndicatorColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </RowIndicatorColumn>
                        <ExpandCollapseColumn>
                            <HeaderStyle Width="20px"></HeaderStyle>
                        </ExpandCollapseColumn>
                        <Columns>

                            <telerik:GridBoundColumn DataField="Audit_ID" HeaderAbbr="Audit_ID" HeaderText="Audit_ID"
                                UniqueName="Audit_ID">
                            </telerik:GridBoundColumn>
                            <telerik:GridDateTimeColumn DataField="DT_Audit" HeaderAbbr="DT_Audit" HeaderText="DT_Audit"
                                UniqueName="DT_Audit">
                            </telerik:GridDateTimeColumn>
                            <telerik:GridDateTimeColumn DataField="NextAttemptAt" HeaderAbbr="NextAttemptAt" HeaderText="NextAttemptAt"
                                UniqueName="NextAttemptAt">
                            </telerik:GridDateTimeColumn>
                            <telerik:GridDropDownColumn DataField="Status" HeaderText="Status" HeaderAbbr="Status"
                                UniqueName="Status" DataSourceID="sdsOutboxStatus"
                                ListTextField="text" ListValueField="value">
                            </telerik:GridDropDownColumn>
                            <telerik:GridNumericColumn DataField="Attempts" HeaderAbbr="Attempts" HeaderText="Attempts"
                                UniqueName="Attempts">
                            </telerik:GridNumericColumn>
                            <telerik:GridBoundColumn DataField="LastError" HeaderAbbr="LastError" HeaderText="LastError"
                                UniqueName="LastError">
                            </telerik:GridBoundColumn>


                        </Columns>
                    </MasterTableView>
                    <ClientSettings AllowColumnsReorder="false"
                        EnableRowHoverStyle="true"
                        EnablePostBackOnRowClick="false"
                        EnableAlternatingItems="true">
                        <ClientEvents OnPopUpShowing="PopUpShowing" />
                        <Selecting AllowRowSelect="true"></Selecting>
                    </ClientSettings>
                </telerik:RadGrid>
                <asp:SqlDataSource ID="sdsAudit" runat="server"
                    ConnectionString="<%$ ConnectionStrings:FXEMail %>"
                    SelectCommand="csp_History_Audit" SelectCommandType="StoredProcedure">
                    <SelectParameters>
                        <asp:ControlParameter Name="ID" Type="Int32"
                            ControlID="grdHistory" PropertyName="SelectedValue"
                            DefaultValue="0" />
                    </SelectParameters>

                </asp:SqlDataSource>
            </telerik:RadPageView>

        </telerik:RadMultiPage>
    </div>
</asp:Content>
