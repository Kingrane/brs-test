using System.Globalization;
using System.Xml.Linq;

namespace BrsBackend;

/// <summary>
/// Port of the fast-xml-parser setup in api/student/discipline/events.js:
/// attributes keyed with "@_", text under "#text", tag values coerced to
/// numbers/booleans, and `event`/`Event` always collected into an array.
/// </summary>
public static class XmlJson
{
    private static readonly string[] AlwaysArray = ["event", "Event"];

    public static Dictionary<string, object?> Parse(string xml)
    {
        var root = XDocument.Parse(xml).Root
                   ?? throw new FormatException("XML has no root element");

        return new Dictionary<string, object?> { [KeyOf(root, root.Name)] = ParseElement(root) };
    }

    private static object? ParseElement(XElement element)
    {
        var node = new Dictionary<string, object?>();

        foreach (var attribute in element.Attributes())
        {
            if (attribute.IsNamespaceDeclaration) continue;
            node["@_" + KeyOf(element, attribute.Name)] = attribute.Value;
        }

        foreach (var group in element.Elements().GroupBy(child => KeyOf(element, child.Name)))
        {
            var children = group.Select(ParseElement).ToList();
            node[group.Key] = children.Count == 1 && !AlwaysArray.Contains(group.Key)
                ? children[0]
                : children;
        }

        var text = string.Concat(element.Nodes().OfType<XText>().Select(part => part.Value)).Trim();
        if (node.Count == 0) return Coerce(text);
        if (text.Length > 0) node["#text"] = Coerce(text);

        return node;
    }

    /// <summary>
    /// XName.ToString() gives Clark notation ("{ns}name"), so the in-scope prefix is
    /// resolved by hand to match fast-xml-parser's keys ("soap:Envelope"). A default
    /// xmlns has no prefix, so it stays on the bare local name.
    /// </summary>
    private static string KeyOf(XElement scope, XName name)
    {
        if (name.Namespace == XNamespace.None) return name.LocalName;

        var prefix = scope.GetPrefixOfNamespace(name.Namespace);
        return string.IsNullOrEmpty(prefix) ? name.LocalName : $"{prefix}:{name.LocalName}";
    }

    /// <summary>fast-xml-parser's default tag coercion, minus the leading-zero conversion.</summary>
    private static object? Coerce(string value)
    {
        if (value.Length == 0) return value;
        if (bool.TryParse(value, out var boolean)) return boolean;
        if (value[0] is not ('-' or '+' or >= '0' and <= '9')) return value;

        var digits = value.TrimStart('-', '+');
        if (digits.Length > 1 && digits[0] == '0') return value;

        if (long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var integer)) return integer;
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)) return number;
        return value;
    }
}
