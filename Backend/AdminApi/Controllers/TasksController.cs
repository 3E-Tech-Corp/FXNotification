using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskRepository _repository;
    private readonly ILogger<TasksController> _logger;

    public TasksController(ITaskRepository repository, ILogger<TasksController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationTask>>> GetAll([FromQuery] int? appId)
    {
        try
        {
            var tasks = await _repository.GetAllAsync(appId);
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tasks");
            return StatusCode(500, "An error occurred while retrieving tasks");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NotificationTask>> GetById(int id)
    {
        try
        {
            var task = await _repository.GetByIdAsync(id);
            if (task == null)
                return NotFound();
            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting task {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the task");
        }
    }

    [HttpPost]
    public async Task<ActionResult<NotificationTask>> Create([FromBody] TaskCreateDto dto)
    {
        try
        {
            var id = await _repository.CreateAsync(dto);
            var task = await _repository.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating task");
            return StatusCode(500, "An error occurred while creating the task");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] TaskUpdateDto dto)
    {
        try
        {
            if (id != dto.Task_ID)
                return BadRequest("ID mismatch");

            await _repository.UpdateAsync(dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating task {Id}", id);
            return StatusCode(500, "An error occurred while updating the task");
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
            _logger.LogError(ex, "Error deleting task {Id}", id);
            return StatusCode(500, "An error occurred while deleting the task");
        }
    }
}
