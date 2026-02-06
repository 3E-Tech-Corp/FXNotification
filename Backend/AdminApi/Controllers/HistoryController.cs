using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HistoryController : ControllerBase
{
    private readonly IHistoryRepository _repository;
    private readonly ILogger<HistoryController> _logger;

    public HistoryController(IHistoryRepository repository, ILogger<HistoryController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HistoryItem>>> GetAll()
    {
        try
        {
            var items = await _repository.GetAllAsync();
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting history items");
            return StatusCode(500, "An error occurred while retrieving history items");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HistoryItem>> GetById(int id)
    {
        try
        {
            var item = await _repository.GetByIdAsync(id);
            if (item == null)
                return NotFound();
            return Ok(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting history item {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the history item");
        }
    }

    [HttpPost("{id}/retry")]
    public async Task<IActionResult> Retry(int id)
    {
        try
        {
            await _repository.RetryAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrying history item {Id}", id);
            return StatusCode(500, "An error occurred while retrying the history item");
        }
    }

    [HttpGet("{id}/audit")]
    public async Task<ActionResult<IEnumerable<AuditItem>>> GetAudit(int id)
    {
        try
        {
            var audit = await _repository.GetAuditAsync(id);
            return Ok(audit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting audit for history item {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the audit");
        }
    }
}
