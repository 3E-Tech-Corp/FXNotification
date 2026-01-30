namespace FXEmailWorker.Models;

/// <summary>
/// Consistent API response wrapper.
/// All endpoints return { success, data, message }.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public static ApiResponse<T> Fail(string message) => new()
    {
        Success = false,
        Data = default,
        Message = message
    };
}

public class ApiResponse : ApiResponse<object>
{
    public new static ApiResponse Ok(object? data = null, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public new static ApiResponse Fail(string message) => new()
    {
        Success = false,
        Data = null,
        Message = message
    };
}
