using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupsController : ControllerBase
{
    private readonly ILookupRepository _repository;
    private readonly ILogger<LookupsController> _logger;

    public LookupsController(ILookupRepository repository, ILogger<LookupsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet("security-modes")]
    public async Task<ActionResult<IEnumerable<SelectOption>>> GetSecurityModes()
    {
        try
        {
            var options = await _repository.GetSecurityModesAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting security modes");
            return StatusCode(500, "An error occurred while retrieving security modes");
        }
    }

    [HttpGet("task-statuses")]
    public async Task<ActionResult<IEnumerable<SelectOption>>> GetTaskStatuses()
    {
        try
        {
            var options = await _repository.GetTaskStatusesAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting task statuses");
            return StatusCode(500, "An error occurred while retrieving task statuses");
        }
    }

    [HttpGet("task-types")]
    public async Task<ActionResult<IEnumerable<SelectOption>>> GetTaskTypes()
    {
        try
        {
            var options = await _repository.GetTaskTypesAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting task types");
            return StatusCode(500, "An error occurred while retrieving task types");
        }
    }

    [HttpGet("mail-priorities")]
    public async Task<ActionResult<IEnumerable<SelectOption>>> GetMailPriorities()
    {
        try
        {
            var options = await _repository.GetMailPrioritiesAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting mail priorities");
            return StatusCode(500, "An error occurred while retrieving mail priorities");
        }
    }

    [HttpGet("outbox-statuses")]
    public async Task<ActionResult<IEnumerable<SelectOption>>> GetOutboxStatuses()
    {
        try
        {
            var options = await _repository.GetOutboxStatusesAsync();
            return Ok(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting outbox statuses");
            return StatusCode(500, "An error occurred while retrieving outbox statuses");
        }
    }
}
