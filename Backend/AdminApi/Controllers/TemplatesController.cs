using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly ITemplateRepository _repository;
    private readonly ILogger<TemplatesController> _logger;

    public TemplatesController(ITemplateRepository repository, ILogger<TemplatesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmailTemplate>>> GetAll([FromQuery] int? appId)
    {
        try
        {
            var templates = await _repository.GetAllAsync(appId);
            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting templates");
            return StatusCode(500, "An error occurred while retrieving templates");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmailTemplate>> GetById(int id)
    {
        try
        {
            var template = await _repository.GetByIdAsync(id);
            if (template == null)
                return NotFound();
            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the template");
        }
    }

    [HttpPost]
    public async Task<ActionResult<EmailTemplate>> Create([FromBody] EmailTemplateCreateDto dto)
    {
        try
        {
            var id = await _repository.CreateAsync(dto);
            var template = await _repository.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template");
            return StatusCode(500, "An error occurred while creating the template");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EmailTemplateUpdateDto dto)
    {
        try
        {
            if (id != dto.ET_ID)
                return BadRequest("ID mismatch");

            await _repository.UpdateAsync(dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating template {Id}", id);
            return StatusCode(500, "An error occurred while updating the template");
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
            _logger.LogError(ex, "Error deleting template {Id}", id);
            return StatusCode(500, "An error occurred while deleting the template");
        }
    }
}
