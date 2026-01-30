using Scriban;
using Scriban.Runtime;
using System.Data;
using System.Text.Json.Nodes;

static class Utility
{
    public static Dictionary<string, object?> RowToDict(DataRow row)
    {
        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (DataColumn c in row.Table.Columns)
            dict[c.ColumnName] = row[c] is DBNull ? null : row[c];
        return dict;
    }

    public static List<Dictionary<string, object?>> TableToList(DataTable table)
    {
        var list = new List<Dictionary<string, object?>>(table.Rows.Count);
        foreach (DataRow r in table.Rows) list.Add(RowToDict(r));
        return list;
    }

    public static ScriptObject BuildScribanModel(string? bodyJson, string? detailJson)
    {
        object? ToScriban(JsonNode? node)
        {
            if (node is null) return null;
            return node switch
            {
                JsonObject o => o.Aggregate(new ScriptObject(),
                    (so, kv) => { so[kv.Key] = ToScriban(kv.Value); return so; }),
                JsonArray a => a.Aggregate(new ScriptArray(),
                    (sa, v) => { sa.Add(ToScriban(v)); return sa; }),
                JsonValue v => v.TryGetValue<bool>(out var b) ? b
                           : v.TryGetValue<long>(out var l) ? l
                           : v.TryGetValue<decimal>(out var m) ? m
                           : v.TryGetValue<double>(out var d) ? d
                           : v.ToString(),
                _ => null
            };
        }

        var root = new ScriptObject();

        // main object (always present)
        var mainObj = string.IsNullOrWhiteSpace(bodyJson)
            ? new JsonObject()
            : (JsonNode.Parse(bodyJson) as JsonObject)
                ?? throw new InvalidOperationException("BodyJson must be a JSON object.");

        var mainSO = (ScriptObject)ToScriban(mainObj)!;
        root["main"] = mainSO;

        // flatten main to top-level for convenience ({{ CustomerName }})
        foreach (var kv in mainSO) root[kv.Key] = kv.Value;

        // details / lines
        if (!string.IsNullOrWhiteSpace(detailJson))
        {
            var detailNode = JsonNode.Parse(detailJson)!;
            var mapped = ToScriban(detailNode);

            if (mapped is ScriptArray arr)
            {
                root["details"] = arr;
                root["lines"] = arr; // alias
            }
            else if (mapped is ScriptObject so)
            {
                // merge all props to root
                foreach (var kv in so) root[kv.Key] = kv.Value;

                // if it has a single array member, also surface as details/lines
                var singleArray = so.FirstOrDefault(kv => kv.Value is ScriptArray).Value as ScriptArray;
                if (singleArray != null)
                {
                    root["details"] = singleArray;
                    root["lines"] = singleArray;
                }
            }
            else
            {
                throw new InvalidOperationException("DetailJson must be a JSON array or object.");
            }
        }

        return root;
    }

    public static (string subject, string html) RenderWithScriban(
        string subjectTemplate, string bodyTemplate, ScriptObject model)
    {
        var ctx = new TemplateContext();
        ctx.PushGlobal(model);

        var subjTpl = Template.Parse(subjectTemplate);
        var bodyTpl = Template.Parse(bodyTemplate);

        return (subjTpl.Render(ctx), bodyTpl.Render(ctx));
    }

    public static string MergeAddress(string? ItemAddress, string TaskAddress)
    {
        if (TaskAddress.StartsWith("+"))
            return (ItemAddress ?? "") + ";" + TaskAddress.Substring(1);

        if (string.IsNullOrEmpty(ItemAddress))
            return TaskAddress;

        if (TaskAddress.Length > 1)
            return TaskAddress;

        return ItemAddress;
    }
}
