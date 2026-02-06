using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationRepository _repository;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(IApplicationRepository repository, ILogger<ApplicationsController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Application>>> GetAll()
    {
        try
        {
            var apps = await _repository.GetAllAsync();
            return Ok(apps);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting applications");
            return StatusCode(500, "An error occurred while retrieving applications");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Application>> GetById(int id)
    {
        try
        {
            var app = await _repository.GetByIdAsync(id);
            if (app == null)
                return NotFound();
            return Ok(app);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting application {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the application");
        }
    }

    [HttpPost]
    public async Task<ActionResult<Application>> Create([FromBody] ApplicationCreateDto dto)
    {
        try
        {
            var id = await _repository.CreateAsync(dto);
            var app = await _repository.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, app);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating application");
            return StatusCode(500, "An error occurred while creating the application");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ApplicationUpdateDto dto)
    {
        try
        {
            if (id != dto.App_ID)
                return BadRequest("ID mismatch");

            await _repository.UpdateAsync(dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating application {Id}", id);
            return StatusCode(500, "An error occurred while updating the application");
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
            _logger.LogError(ex, "Error deleting application {Id}", id);
            return StatusCode(500, "An error occurred while deleting the application");
        }
    }
}
