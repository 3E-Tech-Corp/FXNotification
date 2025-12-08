using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OutboxController : ControllerBase
{
    private readonly IOutboxRepository _repository;
    private readonly ILogger<OutboxController> _logger;

    public OutboxController(IOutboxRepository repository, ILogger<OutboxController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OutboxItem>>> GetAll()
    {
        try
        {
            var items = await _repository.GetAllAsync();
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting outbox items");
            return StatusCode(500, "An error occurred while retrieving outbox items");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OutboxItem>> GetById(int id)
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
            _logger.LogError(ex, "Error getting outbox item {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the outbox item");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] OutboxUpdateDto dto)
    {
        try
        {
            if (id != dto.ID)
                return BadRequest("ID mismatch");

            await _repository.UpdateAsync(dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating outbox item {Id}", id);
            return StatusCode(500, "An error occurred while updating the outbox item");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting outbox item {Id}", id);
            return StatusCode(500, "An error occurred while deleting the outbox item");
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
            _logger.LogError(ex, "Error retrying outbox item {Id}", id);
            return StatusCode(500, "An error occurred while retrying the outbox item");
        }
    }
}
